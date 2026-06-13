use std::{
    env, fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use serde::Serialize;
use tauri::{AppHandle, Manager};

const DATABASE_FILE_NAME: &str = "meru-gst.db";
const LOCAL_SEED_FILE_NAME: &str = "local_seed_pdf_sample_data.sql";

#[derive(Serialize)]
struct DatabaseExport {
    bytes: Vec<u8>,
    file_name: String,
    path: String,
}

#[derive(Serialize)]
struct DatabaseImportResult {
    path: String,
    backup_path: Option<String>,
}

#[derive(Serialize)]
struct LocalSeedScript {
    path: String,
    sql: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            meru_database_path,
            export_meru_database,
            import_meru_database,
            read_local_seed_script
        ])
        .plugin(tauri_plugin_sql::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}

#[tauri::command]
fn meru_database_path(app: AppHandle) -> Result<String, String> {
    database_path(&app).map(path_to_string)
}

#[tauri::command]
fn export_meru_database(app: AppHandle) -> Result<DatabaseExport, String> {
    let path = database_path(&app)?;
    let bytes = fs::read(&path)
        .map_err(|error| format!("Could not read database at {}: {error}", path.display()))?;

    Ok(DatabaseExport {
        bytes,
        file_name: format!("meru-gst-{}.db", unix_timestamp()),
        path: path_to_string(path),
    })
}

#[tauri::command]
fn import_meru_database(app: AppHandle, bytes: Vec<u8>) -> Result<DatabaseImportResult, String> {
    validate_sqlite_database(&bytes)?;

    let path = database_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Could not create database directory: {error}"))?;
    }

    let backup_path = if path.exists() {
        let backup_path = path.with_file_name(format!("meru-gst.backup-{}.db", unix_timestamp()));
        fs::copy(&path, &backup_path).map_err(|error| {
            format!(
                "Could not back up current database at {}: {error}",
                backup_path.display()
            )
        })?;
        Some(backup_path)
    } else {
        None
    };

    remove_database_sidecars(&path)?;

    let temp_path = path.with_file_name(format!("{}.importing", DATABASE_FILE_NAME));
    fs::write(&temp_path, bytes)
        .map_err(|error| format!("Could not write imported database: {error}"))?;

    if path.exists() {
        fs::remove_file(&path).map_err(|error| {
            format!(
                "Could not replace current database at {}: {error}",
                path.display()
            )
        })?;
    }

    fs::rename(&temp_path, &path)
        .map_err(|error| format!("Could not move imported database into place: {error}"))?;

    Ok(DatabaseImportResult {
        path: path_to_string(path),
        backup_path: backup_path.map(path_to_string),
    })
}

#[tauri::command]
fn read_local_seed_script(app: AppHandle) -> Result<LocalSeedScript, String> {
    let mut candidates = local_seed_candidates();

    if let Ok(app_data_dir) = app.path().app_data_dir() {
        candidates.push(app_data_dir.join(LOCAL_SEED_FILE_NAME));
    }

    for candidate in candidates {
        if candidate.exists() {
            let sql = fs::read_to_string(&candidate).map_err(|error| {
                format!(
                    "Could not read local seed script at {}: {error}",
                    candidate.display()
                )
            })?;

            return Ok(LocalSeedScript {
                path: path_to_string(candidate),
                sql,
            });
        }
    }

    Err(format!(
        "No local seed script found. Expected an ignored file named {LOCAL_SEED_FILE_NAME} in apps/desktop/src-tauri/migrations or the app data directory."
    ))
}

fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path| path.join(DATABASE_FILE_NAME))
        .map_err(|error| format!("Could not resolve app data directory: {error}"))
}

fn local_seed_candidates() -> Vec<PathBuf> {
    let current_dir = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));

    vec![
        current_dir
            .join("migrations")
            .join(LOCAL_SEED_FILE_NAME),
        current_dir
            .join("src-tauri")
            .join("migrations")
            .join(LOCAL_SEED_FILE_NAME),
        current_dir
            .join("apps")
            .join("desktop")
            .join("src-tauri")
            .join("migrations")
            .join(LOCAL_SEED_FILE_NAME),
    ]
}

fn validate_sqlite_database(bytes: &[u8]) -> Result<(), String> {
    const SQLITE_HEADER: &[u8] = b"SQLite format 3\0";

    if bytes.starts_with(SQLITE_HEADER) {
        Ok(())
    } else {
        Err("The selected file is not a valid SQLite database.".to_string())
    }
}

fn remove_database_sidecars(path: &Path) -> Result<(), String> {
    for suffix in ["-wal", "-shm"] {
        let sidecar = path.with_file_name(format!("{DATABASE_FILE_NAME}{suffix}"));
        if sidecar.exists() {
            fs::remove_file(&sidecar)
                .map_err(|error| format!("Could not remove {}: {error}", sidecar.display()))?;
        }
    }

    Ok(())
}

fn unix_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

fn path_to_string(path: PathBuf) -> String {
    path.to_string_lossy().into_owned()
}
