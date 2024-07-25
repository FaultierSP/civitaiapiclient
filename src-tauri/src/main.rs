// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use reqwest;
use std::fs::{self, File};
use std::io::copy;
use std::path::Path;
use directories::UserDirs;
use little_exif::metadata::Metadata;
use little_exif::exif_tag::ExifTag;
//use tauri::api::dialog;

#[derive(Serialize,Deserialize)]
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

fn load_config() -> Result<Config,confy::ConfyError> {
    confy::load("civitaiapiclient",None)
}

fn config_to_json() -> Result<String,Box<dyn std::error::Error>> {
    let config=load_config()?;
    let json = serde_json::to_string(&config)?;
    Ok(json)
}

#[tauri::command]
fn get_current_config() -> Result<String,String> {    
    config_to_json().map_err(|e| e.to_string())
}

fn save_config_from_json(config_json: &str) -> Result<(),Box<dyn std::error::Error>> {
    let config:Config = serde_json::from_str(config_json)?;
    confy::store("civitaiapiclient",None,config)?;
    Ok(())
}

#[tauri::command]
fn save_config(config_json: &str) -> Result<(),String> {
    save_config_from_json(config_json).map_err(|e| e.to_string())
}

#[tauri::command]
fn download_image(url: String, author: String, image_description: String) -> Result<String, String> {
    /*let user_dirs = UserDirs::new().ok_or("Could not retrieve user directories.")?;
    let download_dir=user_dirs.download_dir().ok_or("Could not retrieve the download directory.")?;
    */
    let config = load_config().map_err(|e| e.to_string())?;
    let download_dir = config.download_dir.unwrap();

    let folder_name=format!("{}/Civitai/{}",download_dir,author);

    if !Path::new(&folder_name).exists() {
        fs::create_dir_all(folder_name.clone()).map_err(|e| e.to_string())?;
    }

    let image_name=url.split('/').last().ok_or("Invalid image URL");
    let image_path_string=format!("{}/{}",folder_name,image_name.unwrap());
    let image_path = Path::new(&image_path_string);

    if !image_path.exists() {
        let mut response = reqwest::blocking::get(url).map_err(|e| e.to_string())?;
        let mut file = File::create(image_path).map_err(|e| e.to_string())?;
        copy(&mut response, &mut file).map_err(|e| e.to_string())?;
    }

    //Adding the generation data to the EXIF tag.
    let mut metadata = Metadata::new_from_path(image_path).map_err(|e| e.to_string())?;
    metadata.set_tag(ExifTag::ImageDescription(image_description));
    metadata.write_to_file(&image_path).map_err(|e| e.to_string())?;

    Ok ("k".into())
}

fn main() {
    //So, one day webkit decides to ship an update that breaks the app on some configurations.
    //Hope to remove these env declarations soon, as they will be marked unsafe on future versions of rust.
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_current_config,save_config,download_image])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
