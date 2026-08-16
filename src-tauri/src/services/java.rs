use crate::models::JavaInstallation;
use std::path::{Path, PathBuf};
use std::process::Command;

pub fn detect_all() -> Vec<JavaInstallation> {
    let mut found = Vec::new();
    let mut seen = Vec::new();

    for candidate in candidate_paths() {
        if let Some(install) = probe_java(&candidate) {
            if !seen.contains(&install.path) {
                seen.push(install.path.clone());
                found.push(install);
            }
        }
    }

    found.sort_by(|a, b| b.version.cmp(&a.version));
    found
}

fn candidate_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();

    if let Ok(home) = std::env::var("HOME") {
        paths.push(PathBuf::from(&home).join(".local/share/mise/installs/java"));
        paths.push(PathBuf::from(&home).join(".sdkman/candidates/java"));
    }

    for base in ["/usr/lib/jvm", "/usr/local/lib/jvm", "/opt/java"] {
        let p = PathBuf::from(base);
        if p.is_dir() {
            if let Ok(entries) = std::fs::read_dir(&p) {
                for entry in entries.flatten() {
                    paths.push(entry.path().join("bin/java"));
                    paths.push(entry.path().join("bin").join("java"));
                }
            }
        }
    }

    if let Ok(path) = which_java() {
        paths.push(path);
    }

    paths
}

fn which_java() -> Result<PathBuf, ()> {
    let output = Command::new("which").arg("java").output().map_err(|_| ())?;
    if !output.status.success() {
        return Err(());
    }
    let s = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(PathBuf::from(s))
}

fn probe_java(path: &Path) -> Option<JavaInstallation> {
    if !path.exists() {
        return None;
    }
    let output = Command::new(path).arg("-version").output().ok()?;
    let stderr = String::from_utf8_lossy(&output.stderr);
    let version = parse_java_version(&stderr)?;
    let vendor = stderr.lines().next().unwrap_or("Java").to_string();
    Some(JavaInstallation {
        path: path.to_string_lossy().to_string(),
        version,
        vendor,
    })
}

fn parse_java_version(stderr: &str) -> Option<u8> {
    for line in stderr.lines() {
        if let Some(idx) = line.find("version \"") {
            let ver = &line[idx + 9..];
            let major = ver
                .split('.')
                .next()?
                .trim_end_matches('"')
                .parse::<u16>()
                .ok()?;
            let major = if major == 1 {
                ver.split('.').nth(1)?.parse().ok()?
            } else {
                major
            };
            return Some(major as u8);
        }
    }
    None
}
