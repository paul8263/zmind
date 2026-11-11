use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::Manager;

const DOCUMENT_EXTENSION: &str = "zmind";
const MAX_DOCUMENT_BYTES: u64 = 50 * 1024 * 1024;
const MAX_EXPORT_BYTES: u64 = 100 * 1024 * 1024;
const RECOVERY_FILE_NAME: &str = "recovery.json";
const IMPORT_EXTENSIONS: [&str; 3] = ["md", "markdown", "opml"];
const EXPORT_EXTENSIONS: [&str; 5] = ["png", "svg", "md", "markdown", "pdf"];

pub fn validate_document_path(path: &Path) -> Result<(), String> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "The document path must end with .zmind".to_string())?;

    if !extension.eq_ignore_ascii_case(DOCUMENT_EXTENSION) {
        return Err("Only .zmind documents can be opened or saved".to_string());
    }

    if path.file_name().is_none() {
        return Err("The document path must include a file name".to_string());
    }

    Ok(())
}

pub fn read_document(path: &str) -> Result<String, String> {
    let path = Path::new(path);
    validate_document_path(path)?;

    let metadata = fs::metadata(path)
        .map_err(|error| format!("Cannot read {}: {error}", path.display()))?;
    if metadata.len() > MAX_DOCUMENT_BYTES {
        return Err("The document is larger than the 50 MB limit".to_string());
    }

    fs::read_to_string(path).map_err(|error| format!("Cannot read {}: {error}", path.display()))
}

pub fn write_document(path: &str, contents: &str) -> Result<(), String> {
    if contents.len() as u64 > MAX_DOCUMENT_BYTES {
        return Err("The document is larger than the 50 MB limit".to_string());
    }

    let path = Path::new(path);
    validate_document_path(path)?;

    let parent = parent_directory(path);
    if !parent.is_dir() {
        return Err(format!(
            "The destination folder does not exist: {}",
            parent.display()
        ));
    }

    atomic_write(path, contents.as_bytes())
}

pub fn read_import_file(path: &str) -> Result<String, String> {
    let path = Path::new(path);
    validate_extension(path, &IMPORT_EXTENSIONS, "Markdown or OPML")?;

    let metadata = fs::metadata(path)
        .map_err(|error| format!("Cannot read {}: {error}", path.display()))?;
    if metadata.len() > MAX_DOCUMENT_BYTES {
        return Err("The import file is larger than the 50 MB limit".to_string());
    }

    fs::read_to_string(path).map_err(|error| format!("Cannot read {}: {error}", path.display()))
}

pub fn write_export(path: &str, contents: &[u8]) -> Result<(), String> {
    if contents.len() as u64 > MAX_EXPORT_BYTES {
        return Err("The export is larger than the 100 MB limit".to_string());
    }

    let path = Path::new(path);
    validate_extension(path, &EXPORT_EXTENSIONS, "PNG, SVG, Markdown or PDF")?;

    let parent = parent_directory(path);
    if !parent.is_dir() {
        return Err(format!(
            "The destination folder does not exist: {}",
            parent.display()
        ));
    }

    atomic_write(path, contents)
}

pub fn read_recovery_from(data_dir: &Path) -> Result<Option<String>, String> {
    let path = data_dir.join(RECOVERY_FILE_NAME);
    if !path.exists() {
        return Ok(None);
    }

    let metadata = fs::metadata(&path)
        .map_err(|error| format!("Cannot read recovery data: {error}"))?;
    if metadata.len() > MAX_DOCUMENT_BYTES {
        return Err("The recovery snapshot is larger than the 50 MB limit".to_string());
    }

    fs::read_to_string(&path)
        .map(Some)
        .map_err(|error| format!("Cannot read recovery data: {error}"))
}

pub fn write_recovery_to(data_dir: &Path, contents: &str) -> Result<(), String> {
    if contents.len() as u64 > MAX_DOCUMENT_BYTES {
        return Err("The recovery snapshot is larger than the 50 MB limit".to_string());
    }

    fs::create_dir_all(data_dir)
        .map_err(|error| format!("Cannot create the recovery folder: {error}"))?;
    atomic_write(&data_dir.join(RECOVERY_FILE_NAME), contents.as_bytes())
}

pub fn clear_recovery_from(data_dir: &Path) -> Result<(), String> {
    let path = data_dir.join(RECOVERY_FILE_NAME);
    match fs::remove_file(&path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("Cannot clear recovery data: {error}")),
    }
}

fn portable_data_dir(executable: &Path) -> Option<PathBuf> {
    let directory = executable.parent()?;
    if !directory.join("portable.marker").exists() {
        return None;
    }
    Some(directory.join("data"))
}

pub fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Ok(executable) = std::env::current_exe() {
        if let Some(data_directory) = portable_data_dir(&executable) {
            std::fs::create_dir_all(&data_directory)
                .map_err(|error| format!("Cannot create the portable data folder: {error}"))?;
            return Ok(data_directory);
        }
    }

    app.path()
        .app_data_dir()
        .map_err(|error| format!("Cannot locate the application data folder: {error}"))
}

fn parent_directory(path: &Path) -> &Path {
    path.parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."))
}

fn validate_extension(path: &Path, allowed: &[&str], label: &str) -> Result<(), String> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .ok_or_else(|| format!("The file path must end with a supported extension: {label}"))?;

    if !allowed
        .iter()
        .any(|candidate| extension.eq_ignore_ascii_case(candidate))
    {
        return Err(format!("Unsupported file extension: {extension}"));
    }

    if path.file_name().is_none() {
        return Err("The file path must include a file name".to_string());
    }

    Ok(())
}

fn atomic_write(path: &Path, contents: &[u8]) -> Result<(), String> {
    let parent = parent_directory(path);
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "The document path must include a valid file name".to_string())?;
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    let temporary_path = parent.join(format!(
        ".{file_name}.{}.{}.tmp",
        std::process::id(),
        unique
    ));

    let write_result = (|| -> Result<(), String> {
        let mut file = fs::File::create(&temporary_path)
            .map_err(|error| format!("Cannot create {}: {error}", temporary_path.display()))?;
        file.write_all(contents)
            .map_err(|error| format!("Cannot write {}: {error}", temporary_path.display()))?;
        file.sync_all()
            .map_err(|error| format!("Cannot flush {}: {error}", temporary_path.display()))?;
        Ok(())
    })();

    if let Err(error) = write_result {
        let _ = fs::remove_file(&temporary_path);
        return Err(error);
    }

    if let Err(error) = fs::rename(&temporary_path, path) {
        let _ = fs::remove_file(&temporary_path);
        return Err(format!("Cannot replace {}: {error}", path.display()));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    fn test_dir() -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or(Duration::ZERO)
            .as_nanos();
        let dir = std::env::temp_dir().join(format!(
            "zmind-file-test-{}-{unique}",
            std::process::id()
        ));
        fs::create_dir_all(&dir).expect("create test directory");
        dir
    }

    #[test]
    fn validates_zmind_extension_case_insensitively() {
        assert!(validate_document_path(Path::new("map.zmind")).is_ok());
        assert!(validate_document_path(Path::new("map.ZMIND")).is_ok());
        assert!(validate_document_path(Path::new("map.txt")).is_err());
        assert!(validate_document_path(Path::new("map")).is_err());
    }

    #[test]
    fn writes_and_reads_a_document_round_trip() {
        let dir = test_dir();
        let path = dir.join("sample.zmind");
        let contents = r#"{"schemaVersion":1,"title":"demo"}"#;

        write_document(path.to_str().unwrap(), contents).expect("write document");
        assert_eq!(
            read_document(path.to_str().unwrap()).expect("read document"),
            contents
        );

        fs::remove_dir_all(dir).expect("remove test directory");
    }

    #[test]
    fn overwrites_a_document_without_leaving_temporary_files() {
        let dir = test_dir();
        let path = dir.join("sample.zmind");

        write_document(path.to_str().unwrap(), "first").expect("write first version");
        write_document(path.to_str().unwrap(), "second").expect("write second version");

        assert_eq!(read_document(path.to_str().unwrap()).unwrap(), "second");
        let entries = fs::read_dir(&dir)
            .unwrap()
            .map(|entry| entry.unwrap().file_name())
            .collect::<Vec<_>>();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0], "sample.zmind");

        fs::remove_dir_all(dir).expect("remove test directory");
    }

    #[test]
    fn rejects_documents_above_the_size_limit() {
        let dir = test_dir();
        let path = dir.join("sample.zmind");
        let contents = "x".repeat(MAX_DOCUMENT_BYTES as usize + 1);

        assert!(write_document(path.to_str().unwrap(), &contents).is_err());
        assert!(!path.exists());

        fs::remove_dir_all(dir).expect("remove test directory");
    }

    #[test]
    fn reads_markdown_and_opml_imports() {
        let dir = test_dir();
        let markdown_path = dir.join("notes.md");
        let opml_path = dir.join("outline.opml");
        fs::write(&markdown_path, "# Root\n- Child\n").expect("write markdown");
        fs::write(&opml_path, "<opml><body><outline text=\"Root\"/></body></opml>")
            .expect("write opml");

        assert_eq!(
            read_import_file(markdown_path.to_str().unwrap()).unwrap(),
            "# Root\n- Child\n"
        );
        assert!(read_import_file(opml_path.to_str().unwrap())
            .unwrap()
            .contains("outline"));
        assert!(read_import_file(dir.join("map.zmind").to_str().unwrap()).is_err());

        fs::remove_dir_all(dir).expect("remove test directory");
    }

    #[test]
    fn writes_binary_exports_and_rejects_unknown_extensions() {
        let dir = test_dir();
        let png_path = dir.join("map.png");
        let svg_path = dir.join("map.svg");
        let bytes = [0_u8, 1, 2, 3, 255];

        write_export(png_path.to_str().unwrap(), &bytes).expect("write png export");
        write_export(svg_path.to_str().unwrap(), b"<svg/>").expect("write svg export");

        assert_eq!(fs::read(&png_path).unwrap(), bytes);
        assert_eq!(fs::read_to_string(&svg_path).unwrap(), "<svg/>");
        assert!(write_export(dir.join("map.txt").to_str().unwrap(), &bytes).is_err());

        fs::remove_dir_all(dir).expect("remove test directory");
    }

    #[test]
    fn detects_a_portable_data_folder_next_to_the_executable() {
        let dir = test_dir();
        let executable = dir.join("Zmind.exe");

        assert_eq!(portable_data_dir(&executable), None);

        fs::write(dir.join("portable.marker"), "").expect("write portable marker");
        assert_eq!(portable_data_dir(&executable), Some(dir.join("data")));

        fs::remove_dir_all(dir).expect("remove test directory");
    }

    #[test]
    fn manages_recovery_snapshots() {
        let dir = test_dir();

        assert_eq!(read_recovery_from(&dir).unwrap(), None);
        write_recovery_to(&dir, "snapshot").expect("write recovery");
        assert_eq!(
            read_recovery_from(&dir).unwrap(),
            Some("snapshot".to_string())
        );
        clear_recovery_from(&dir).expect("clear recovery");
        assert_eq!(read_recovery_from(&dir).unwrap(), None);
        clear_recovery_from(&dir).expect("clearing missing recovery is harmless");

        fs::remove_dir_all(dir).expect("remove test directory");
    }
}
