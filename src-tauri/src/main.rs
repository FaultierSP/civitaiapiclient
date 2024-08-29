// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod downloader;

use serde::{Deserialize, Serialize};
use directories::UserDirs;
use once_cell::sync::Lazy;
use std::sync::Arc;
use tokio::sync::RwLock;

const NAME_OF_CONFIG_FILE: &str = "configuration.toml";

#[derive(Serialize,Deserialize,Clone,Debug)]
struct Config {
    api_key: String,
    api_prefix: String,
    download_dir: Option<String>
}

impl Default for Config {
    fn default() -> Self {
        // Attempt to get the user's download directory
        let download_dir = match UserDirs::new() {
            Some(user_dirs) => user_dirs.download_dir().map(|path| path.to_str().unwrap_or_default().to_string()),
            None => None,
        };

        Config {
            api_key:"".to_string(),
            api_prefix:"/api/v1/".to_string(),
            download_dir: download_dir,
        }
    }
}

static CONFIG: Lazy<Arc<RwLock<Config>>> = Lazy::new(|| {
    //let config = confy::load("civitaiapiclient",None).unwrap_or_default();
    let config = confy::load_path(NAME_OF_CONFIG_FILE).unwrap_or_default();
    return Arc::new(RwLock::new(config));
});

#[tauri::command]
async fn get_current_config() -> Result<String,String> {
    let config_guard = CONFIG.read().await;

    let json = serde_json::to_string(&config_guard.clone()).map_err(|e| e.to_string())?; 

    return Ok(json);
}

async fn save_config_from_json(config_json: &str) -> Result<(),String> {
    let config:Config = serde_json::from_str(config_json).unwrap();
    
    let mut config_guard = CONFIG.write().await;
    *config_guard = config.clone();
    drop(config_guard);

    //let result = confy::store("civitaiapiclient",None,config);
    let result = confy::store_path(NAME_OF_CONFIG_FILE,config);
    
    match result {
        Ok(_) => return Ok(()),
        Err(e) => return Err(e.to_string()),
    }
}

#[tauri::command]
async fn save_config(config_json: &str) -> Result<(),String> {
    save_config_from_json(config_json).await
}


fn main() {
    //So, one day webkit decides to ship an update that breaks the app on some configurations.
    //Hope to remove these env declarations soon, as they will be marked unsafe on future versions of rust.
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_current_config,
            save_config,
            downloader::download_image,
            downloader::get_metadata,
            downloader::cancel_getting_metadata,
            downloader::download_images_stored_in_metadata,
            downloader::cancel_downloading_images_stored_in_metadata,
            downloader::download_images_from_frontend
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
