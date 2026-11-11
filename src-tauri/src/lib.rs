mod file_io;

use std::path::Path;
use std::sync::Mutex;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{Emitter, Manager, Runtime};

struct PendingOpenFile(Mutex<Option<String>>);

fn find_zmind_arg<I>(args: I) -> Option<String>
where
    I: IntoIterator<Item = String>,
{
    args.into_iter().find(|argument| {
        !argument.starts_with('-')
            && Path::new(argument)
                .extension()
                .and_then(|extension| extension.to_str())
                .is_some_and(|extension| extension.eq_ignore_ascii_case("zmind"))
    })
}

fn build_menu<R: Runtime>(app: &tauri::AppHandle<R>, locale: &str) -> tauri::Result<Menu<R>> {
    let english = locale == "en";
    let file_label = if english { "File" } else { "文件" };
    let new_label = if english { "New" } else { "新建" };
    let open_label = if english { "Open…" } else { "打开…" };
    let save_label = if english { "Save" } else { "保存" };
    let save_as_label = if english { "Save As…" } else { "另存为…" };
    let exit_label = if english { "Exit" } else { "退出" };
    let edit_label = if english { "Edit" } else { "编辑" };
    let undo_label = if english { "Undo" } else { "撤销" };
    let redo_label = if english { "Redo" } else { "重做" };

    let new_item = MenuItem::with_id(app, "new", new_label, true, Some("CmdOrCtrl+N"))?;
    let open_item = MenuItem::with_id(app, "open", open_label, true, Some("CmdOrCtrl+O"))?;
    let save_item = MenuItem::with_id(app, "save", save_label, true, Some("CmdOrCtrl+S"))?;
    let save_as_item = MenuItem::with_id(
        app,
        "save-as",
        save_as_label,
        true,
        Some("CmdOrCtrl+Shift+S"),
    )?;
    let file_separator = PredefinedMenuItem::separator(app)?;
    let exit_item = MenuItem::with_id(app, "exit", exit_label, true, None::<&str>)?;
    let undo_item = MenuItem::with_id(app, "undo", undo_label, true, Some("CmdOrCtrl+Z"))?;
    let redo_item = MenuItem::with_id(
        app,
        "redo",
        redo_label,
        true,
        Some("CmdOrCtrl+Shift+Z"),
    )?;

    let file_menu = Submenu::with_items(
        app,
        file_label,
        true,
        &[
            &new_item,
            &open_item,
            &save_item,
            &save_as_item,
            &file_separator,
            &exit_item,
        ],
    )?;
    let edit_menu = Submenu::with_items(app, edit_label, true, &[&undo_item, &redo_item])?;

    Menu::with_items(app, &[&file_menu, &edit_menu])
}

#[tauri::command]
fn read_document(path: String) -> Result<String, String> {
    file_io::read_document(&path)
}

#[tauri::command]
fn write_document(path: String, contents: String) -> Result<(), String> {
    file_io::write_document(&path, &contents)
}

#[tauri::command]
fn read_import_file(path: String) -> Result<String, String> {
    file_io::read_import_file(&path)
}

#[tauri::command]
fn write_export(path: String, contents: Vec<u8>) -> Result<(), String> {
    file_io::write_export(&path, &contents)
}

#[tauri::command]
fn read_recovery(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let data_dir = file_io::app_data_dir(&app)?;
    file_io::read_recovery_from(&data_dir)
}

#[tauri::command]
fn write_recovery(app: tauri::AppHandle, contents: String) -> Result<(), String> {
    let data_dir = file_io::app_data_dir(&app)?;
    file_io::write_recovery_to(&data_dir, &contents)
}

#[tauri::command]
fn clear_recovery(app: tauri::AppHandle) -> Result<(), String> {
    let data_dir = file_io::app_data_dir(&app)?;
    file_io::clear_recovery_from(&data_dir)
}

#[tauri::command]
fn take_pending_open_file(state: tauri::State<'_, PendingOpenFile>) -> Option<String> {
    state.0.lock().ok().and_then(|mut pending| pending.take())
}

#[tauri::command]
fn set_menu_locale(app: tauri::AppHandle, locale: String) -> Result<(), String> {
    let menu = build_menu(&app, &locale).map_err(|error| error.to_string())?;
    app.set_menu(menu).map_err(|error| error.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(path) = find_zmind_arg(argv) {
                let _ = app.emit("open-file", path);
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let pending = find_zmind_arg(std::env::args());
            app.manage(PendingOpenFile(Mutex::new(pending)));

            let menu = build_menu(app.handle(), "zh")?;
            app.handle().set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            let _ = app.emit("menu-action", event.id().as_ref().to_string());
        })
        .invoke_handler(tauri::generate_handler![
            read_document,
            write_document,
            read_import_file,
            write_export,
            read_recovery,
            write_recovery,
            clear_recovery,
            take_pending_open_file,
            set_menu_locale
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
