use crate::error::{err, Result};
use crate::models::Profile;
use crate::services::instance_meta;
use crate::services::{
    download::{download_to, DownloadOpts, ProgressCtx},
    fabric_install, forge_install, mod_deps, modrinth, mojang, paths, profiles,
};
use std::path::Path;
use tauri::AppHandle;

pub async fn install_profile(profile: &Profile, app: AppHandle) -> Result<()> {
    let progress = ProgressCtx::new(app);
    let game = paths::game_dir(&profile.id);
    std::fs::create_dir_all(&game)?;
    paths::migrate_instance_layout(&profile.id)?;

    let java_path = resolve_java_for_install(profile)?;

    progress.emit(
        "prepare",
        5,
        "Preparing instance…",
        None,
        None,
        None,
        None,
        None,
    );
    let base_id = mojang::install_minecraft_base(&profile.mc_version, &progress).await?;

    let version_id = match profile.loader.as_str() {
        "fabric" => fabric_install::install_fabric(profile, &base_id, &progress).await?,
        "quilt" => fabric_install::install_quilt(profile, &base_id, &progress).await?,
        "forge" => forge_install::install_forge(&profile.mc_version, &java_path, &progress).await?,
        "neoforge" => {
            forge_install::install_neoforge(&profile.mc_version, &java_path, &progress).await?
        }
        other => return Err(err(format!("Unknown loader: {other}"))),
    };

    instance_meta::save_instance_meta(&profile.id, &profile.loader, &version_id)?;

    progress.emit(
        "mod",
        85,
        "Installing HorizonUI from Modrinth…",
        None,
        None,
        None,
        None,
        None,
    );
    // Мод HorizonUI не обязателен для запуска: если для выбранной версии/лоадера
    // его нет в Modrinth, установка инстанса всё равно должна завершиться.
    if let Err(e) = install_horizonui_mod(profile, &progress).await {
        log::warn!("HorizonUI mod was not installed: {e}");
        progress.log(format!("HorizonUI mod skipped: {e}"));
    }

    progress.emit(
        "natives",
        95,
        "Extracting native libraries…",
        None,
        None,
        None,
        None,
        None,
    );
    let natives_version = version_id.clone();
    tokio::task::spawn_blocking(move || {
        crate::services::version_resolve::ensure_natives(&natives_version)
    })
    .await
    .map_err(|e| err(format!("Native extract failed: {e}")))??;

    progress.emit(
        "done",
        100,
        "Install complete",
        None,
        None,
        None,
        None,
        None,
    );
    profiles::mark_installed(&profile.id)?;
    Ok(())
}

async fn install_horizonui_mod(profile: &Profile, progress: &ProgressCtx) -> Result<()> {
    let mod_mc = crate::services::versions::mod_mc_version(&profile.mc_version);
    let release = modrinth::fetch_release(&mod_mc, &profile.loader).await?;
    let dest = paths::mods_dir(&profile.id).join(&release.filename);
    progress.emit(
        "mod",
        88,
        format!("Downloading {}…", release.filename),
        Some(&release.filename),
        None,
        None,
        None,
        None,
    );
    download_to(
        &release.download_url,
        &dest,
        Some(progress),
        DownloadOpts::new("mod", release.filename.clone())
            .with_span(88, 5)
            .with_label(format!("Downloading {}", release.filename)),
    )
    .await?;

    let dep_count = mod_deps::install_modrinth_version_dependencies(
        &profile.id,
        &release.version_id,
        "HorizonUI",
    )
    .await?;
    if dep_count > 0 {
        progress.emit(
            "mod",
            92,
            format!("Installed {} required dependencies", dep_count),
            None,
            None,
            None,
            None,
            None,
        );
    }
    Ok(())
}

fn resolve_java_for_install(profile: &Profile) -> Result<String> {
    if let Some(path) = &profile.java_path {
        if Path::new(path).exists() {
            return Ok(path.clone());
        }
    }
    let required = crate::services::versions::required_java(&profile.mc_version);
    let installs = crate::services::java::detect_all();
    installs
        .into_iter()
        .find(|j| j.version >= required)
        .map(|j| j.path)
        .ok_or_else(|| {
            err(format!(
                "Java {}+ required. Install Java or set a custom path in profile settings.",
                required
            ))
        })
}
