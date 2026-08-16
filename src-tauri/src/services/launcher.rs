use crate::error::{err, Result};
use crate::models::{GameLogEntry, Profile};
use crate::services::{
    auth, authlib_injector, instance_meta, java, paths, profiles, version_resolve, versions,
};
use chrono::Utc;
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::Instant;
use tauri::{AppHandle, Emitter};

struct GameSession {
    profile_id: String,
    pid: u32,
}

static GAME_SESSION: Mutex<Option<GameSession>> = Mutex::new(None);
static GAME_APP: Mutex<Option<AppHandle>> = Mutex::new(None);

pub fn is_game_running() -> bool {
    GAME_SESSION.lock().unwrap().is_some()
}

fn kill_pid(pid: u32) -> Result<()> {
    #[cfg(unix)]
    {
        let status = Command::new("kill")
            .arg("-TERM")
            .arg(pid.to_string())
            .status()
            .map_err(|e| err(format!("Failed to kill game: {e}")))?;
        if !status.success() {
            Command::new("kill")
                .arg("-KILL")
                .arg(pid.to_string())
                .status()
                .map_err(|e| err(format!("Failed to kill game: {e}")))?;
        }
        return Ok(());
    }
    #[cfg(windows)]
    {
        Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .status()
            .map_err(|e| err(format!("Failed to kill game: {e}")))?;
        Ok(())
    }
}

pub async fn launch(profile: &Profile, app: AppHandle) -> Result<u32> {
    if GAME_SESSION.lock().unwrap().is_some() {
        return Err(err("A game instance is already running"));
    }

    if !profile.installed {
        return Err(err("Instance not installed. Run Install first."));
    }

    *GAME_APP.lock().unwrap() = Some(app.clone());

    let java_path = resolve_java(profile)?;
    let game = paths::game_dir(&profile.id);
    let meta = instance_meta::load_instance_meta(&profile.id)?;
    let version_id = meta.version_id.clone();

    paths::migrate_instance_layout(&profile.id)?;

    let _ = emit_game_log(&app, "Preparing libraries and assets…", "info");

    let resolved = tokio::task::spawn_blocking({
        let version_id = version_id.clone();
        move || version_resolve::resolve_launch(&version_id)
    })
    .await
    .map_err(|e| err(format!("Launch preparation failed: {e}")))??;

    let natives = paths::natives_dir(&version_id);

    let cp = resolved
        .classpath
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect::<Vec<_>>()
        .join(if cfg!(windows) { ";" } else { ":" });

    let account = auth::get_account()?;
    let asset_index = resolve_asset_index(&profile.mc_version)?;

    let mut cmd = Command::new(&java_path);

    if let Some(acc) = &account {
        if acc.auth_type == "elyby" {
            let injector = authlib_injector::ensure_jar_or_err().await?;
            cmd.arg(format!("-javaagent:{}=ely.by", injector.to_string_lossy()));
        }
    }

    for arg in &resolved.jvm_args {
        cmd.arg(arg);
    }

    if !resolved
        .jvm_args
        .iter()
        .any(|a| a.contains("enable-native-access"))
    {
        cmd.arg("--enable-native-access=ALL-UNNAMED");
    }

    cmd.arg(format!("-Xmx{}M", profile.ram_mb))
        .arg(format!("-Xms{}M", profile.ram_mb.min(1024)))
        .arg(format!("-Djava.library.path={}", natives.display()))
        .arg("-cp")
        .arg(cp)
        .arg(&resolved.main_class)
        .current_dir(&game)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(acc) = &account {
        cmd.arg("--username").arg(&acc.username);
        cmd.arg("--uuid").arg(&acc.uuid);
        cmd.arg("--accessToken").arg(&acc.access_token);
        let user_type = match acc.auth_type.as_str() {
            "microsoft" => "msa",
            "elyby" => "mojang",
            _ => "legacy",
        };
        cmd.arg("--userType").arg(user_type);
    } else {
        cmd.arg("--username").arg("HorizonPlayer");
    }

    cmd.arg("--version").arg(&resolved.version_id);
    cmd.arg("--gameDir").arg(&game);
    cmd.arg("--assetsDir").arg(paths::assets_dir());
    cmd.arg("--assetIndex").arg(&asset_index);
    cmd.arg("--versionType").arg("release");

    emit_game_log(
        &app,
        format!("Launching {} ({})", profile.name, resolved.version_id),
        "info",
    )?;

    let mut child = cmd
        .spawn()
        .map_err(|e| err(format!("Failed to launch: {e}")))?;

    let pid = child.id();

    GAME_SESSION.lock().unwrap().replace(GameSession {
        profile_id: profile.id.clone(),
        pid,
    });

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let app_stdout = app.clone();
    let app_stderr = app.clone();
    let app_exit = app.clone();
    let profile_id = profile.id.clone();
    let started_at = Instant::now();

    if let Some(out) = stdout {
        std::thread::spawn(move || stream_game_output(out, app_stdout, false));
    }
    if let Some(out) = stderr {
        std::thread::spawn(move || stream_game_output(out, app_stderr, true));
    }

    std::thread::spawn(move || {
        let status = child.wait();
        GAME_SESSION.lock().unwrap().take();
        let elapsed = started_at.elapsed().as_millis() as u64;
        let _ = profiles::add_play_time(&profile_id, elapsed);
        let code = status.as_ref().ok().and_then(|s| s.code()).unwrap_or(-1);
        let _ = app_exit.emit(
            "game-exit",
            serde_json::json!({
                "profileId": profile_id,
                "exitCode": code,
            }),
        );
        let _ = emit_game_log(
            &app_exit,
            format!("Game exited (code {code})"),
            if code == 0 { "success" } else { "error" },
        );
    });

    let mut updated = profile.clone();
    updated.last_played = Some(Utc::now().to_rfc3339());
    profiles::update(updated)?;

    Ok(pid)
}

pub fn kill_game() -> Result<()> {
    let session = GAME_SESSION.lock().unwrap().take();
    if let Some(session) = session {
        kill_pid(session.pid)?;
        if let Some(app) = GAME_APP.lock().unwrap().as_ref() {
            let _ = emit_game_log(app, "Game killed by user.", "warn");
        }
        Ok(())
    } else {
        Err(err("No game is running"))
    }
}

fn resolve_asset_index(mc_version: &str) -> Result<String> {
    let json_path = paths::versions_dir()
        .join(mc_version)
        .join(format!("{mc_version}.json"));
    if json_path.exists() {
        let raw = std::fs::read_to_string(&json_path)?;
        let value: serde_json::Value = serde_json::from_str(&raw)?;
        if let Some(id) = value["assetIndex"]["id"].as_str() {
            return Ok(id.to_string());
        }
    }
    Ok(mc_version.to_string())
}

fn stream_game_output<R: std::io::Read + Send + 'static>(
    reader: R,
    app: AppHandle,
    is_stderr: bool,
) {
    let buf = BufReader::new(reader);
    for line in buf.lines() {
        let line = match line {
            Ok(value) => value,
            Err(_) => break,
        };
        let trimmed = line.trim();
        if trimmed.is_empty() || should_skip_game_log(trimmed, is_stderr) {
            continue;
        }
        let level = if is_stderr && trimmed.contains("ERROR") {
            "error"
        } else if is_stderr && trimmed.contains("WARN") {
            "warn"
        } else {
            "info"
        };
        let _ = emit_game_log(&app, trimmed, level);
    }
}

fn should_skip_game_log(line: &str, is_stderr: bool) -> bool {
    let lower = line.to_lowercase();
    if lower.contains("mixin") || lower.contains("[debug]") || lower.contains("loading mixin") {
        return true;
    }
    if !is_stderr && lower.starts_with("[") && lower.contains("]") && !lower.contains("error") {
        if lower.contains("sponge") || lower.contains("fabric") && lower.contains("loading") {
            return true;
        }
    }
    false
}

fn emit_game_log(app: &AppHandle, message: impl Into<String>, level: &str) -> Result<()> {
    app.emit(
        "game-log",
        GameLogEntry {
            message: message.into(),
            level: level.into(),
        },
    )
    .map_err(|e| err(e.to_string()))?;
    Ok(())
}

fn resolve_java(profile: &Profile) -> Result<String> {
    if let Some(path) = &profile.java_path {
        if std::path::Path::new(path).exists() {
            return Ok(path.clone());
        }
    }
    let required = versions::required_java(&profile.mc_version);
    let installs = java::detect_all();
    installs
        .into_iter()
        .find(|j| j.version >= required)
        .map(|j| j.path)
        .ok_or_else(|| {
            err(format!(
                "Java {}+ required for Minecraft {}.",
                required, profile.mc_version
            ))
        })
}
