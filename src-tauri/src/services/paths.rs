use std::path::{Component, Path, PathBuf};

use crate::error::{err, Result};

pub fn launcher_root() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".horizonui-launcher")
}

pub fn profiles_file() -> PathBuf {
    launcher_root().join("profiles.json")
}

pub fn settings_file() -> PathBuf {
    launcher_root().join("launcher.json")
}

pub fn instances_dir() -> PathBuf {
    launcher_root().join("instances")
}

pub fn instance_dir(profile_id: &str) -> PathBuf {
    instances_dir().join(safe_component(profile_id))
}

pub fn game_dir(profile_id: &str) -> PathBuf {
    instance_dir(profile_id).join(".minecraft")
}

pub fn libraries_dir() -> PathBuf {
    launcher_root().join("libraries")
}

pub fn versions_dir() -> PathBuf {
    launcher_root().join("versions")
}

pub fn natives_dir(version_id: &str) -> PathBuf {
    launcher_root()
        .join("natives")
        .join(safe_component(version_id))
}

pub fn assets_dir() -> PathBuf {
    launcher_root().join("assets")
}

pub fn cache_dir() -> PathBuf {
    launcher_root().join("cache")
}

pub fn logs_dir() -> PathBuf {
    launcher_root().join("logs")
}

pub fn log_file() -> PathBuf {
    logs_dir().join("horizonui.log")
}

pub fn horizon_config_path(profile_id: &str) -> PathBuf {
    game_dir(profile_id).join("config").join("horizonui.json")
}

pub fn horizon_config_path_legacy(profile_id: &str) -> PathBuf {
    game_dir(profile_id)
        .join("config")
        .join("horizonui")
        .join("horizonui.json")
}

pub fn mods_dir(profile_id: &str) -> PathBuf {
    game_dir(profile_id).join("mods")
}

pub fn account_file() -> PathBuf {
    launcher_root().join("account.json")
}

pub fn accounts_file() -> PathBuf {
    launcher_root().join("accounts.json")
}

pub fn authlib_injector_jar() -> PathBuf {
    launcher_root().join("authlib-injector.jar")
}

pub fn ensure_launcher_dirs() -> std::io::Result<()> {
    std::fs::create_dir_all(instances_dir())?;
    std::fs::create_dir_all(libraries_dir())?;
    std::fs::create_dir_all(versions_dir())?;
    std::fs::create_dir_all(assets_dir())?;
    std::fs::create_dir_all(cache_dir())?;
    std::fs::create_dir_all(logs_dir())?;
    Ok(())
}

pub fn migrate_instance_layout(profile_id: &str) -> std::io::Result<()> {
    let instance = instance_dir(profile_id);
    merge_tree(&instance.join("libraries"), &libraries_dir())?;
    merge_tree(&instance.join("versions"), &versions_dir())?;
    merge_tree(&instance.join(".minecraft").join("assets"), &assets_dir())?;

    remove_dir_if_exists(&instance.join("libraries"))?;
    remove_dir_if_exists(&instance.join("versions"))?;
    remove_dir_if_exists(&instance.join("natives"))?;

    let legacy_assets = instance.join(".minecraft").join("assets");
    if legacy_assets.exists() {
        if legacy_assets.read_dir().map(|d| d.count()).unwrap_or(0) == 0 {
            remove_dir_if_exists(&legacy_assets)?;
        }
    }

    Ok(())
}

fn merge_tree(src: &Path, dst: &Path) -> std::io::Result<()> {
    if !src.is_dir() {
        return Ok(());
    }
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if src_path.is_dir() {
            merge_tree(&src_path, &dst_path)?;
        } else if !dst_path.exists() {
            if let Some(parent) = dst_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            std::fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

fn remove_dir_if_exists(path: &Path) -> std::io::Result<()> {
    if path.exists() {
        std::fs::remove_dir_all(path)?;
    }
    Ok(())
}

pub fn is_safe_path_component(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 128
        && name != "."
        && name != ".."
        && !name.contains('/')
        && !name.contains('\\')
        && !name.contains('\0')
}

fn safe_component(name: &str) -> &str {
    if is_safe_path_component(name) {
        name
    } else {
        "_"
    }
}

pub fn validate_path_component(name: &str) -> Result<()> {
    if is_safe_path_component(name) {
        Ok(())
    } else {
        Err(err("Invalid path"))
    }
}

pub fn safe_filename(name: &str) -> Result<String> {
    let base = Path::new(name)
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| err("Invalid filename"))?;
    validate_path_component(base)?;
    Ok(base.to_string())
}

pub fn join_contained(base: &Path, rel: &str) -> Result<PathBuf> {
    let rel = rel.replace('\\', "/");
    let rel_path = Path::new(&rel);
    if rel_path.is_absolute() {
        return Err(err("Invalid path"));
    }
    let mut out = base.to_path_buf();
    for component in rel_path.components() {
        match component {
            Component::Normal(part) => out.push(part),
            Component::CurDir => {}
            _ => return Err(err("Invalid path")),
        }
    }
    Ok(out)
}
