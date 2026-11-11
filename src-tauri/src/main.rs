// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(windows)]
fn enable_portable_data_dir() {
    if std::env::var_os("WEBVIEW2_USER_DATA_FOLDER").is_some() {
        return;
    }

    let Ok(executable) = std::env::current_exe() else {
        return;
    };
    let Some(directory) = executable.parent() else {
        return;
    };
    if !directory.join("portable.marker").exists() {
        return;
    }

    let data_directory = directory.join("data");
    if std::fs::create_dir_all(&data_directory).is_err() {
        return;
    }

    // SAFETY: this runs before Tauri starts any threads or webviews.
    unsafe {
        std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", data_directory);
    }
}

fn main() {
    #[cfg(windows)]
    enable_portable_data_dir();

    zmind_lib::run()
}
