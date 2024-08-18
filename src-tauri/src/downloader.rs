use super::CONFIG;

use std::path::Path;
use std::fs::{self, File};
use std::io::copy;
use reqwest;
use std::collections::HashMap;
use little_exif::metadata::Metadata;
use little_exif::exif_tag::ExifTag;
use serde::{Deserialize, Serialize};
use once_cell::sync::Lazy;
use std::sync::Arc;
use tokio::sync::{Mutex,RwLock};

//Metadata definitions and static
#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize)]
struct MetaOfImage {
    #[serde(skip_serializing_if = "Option::is_none")]
    seed: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    steps: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    negativePrompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    sampler: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    cfgScale: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    clipSkip: Option<f32>,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize)]
struct MetadataItem {
    id: u32,
    url: String,
    username: String,
    postId: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    meta: Option<MetaOfImage>,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize)]
struct MetadataOfAPIResponse {
    nextPage: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ImagesAPIResponse {
    items: Vec<MetadataItem>,
    metadata: Option<MetadataOfAPIResponse>,
}

#[derive(Debug, Serialize, Deserialize)]
struct MetadataCollection {
    items: HashMap<String, MetadataItem>,
}

static IMAGES_TO_DOWNLOAD: Lazy<Arc<Mutex<Vec<MetadataItem>>>> = Lazy::new(|| Arc::new(Mutex::new(vec![])));
static AMOUNT_OF_IMAGES_TO_DOWNLOAD : Lazy<Mutex<u32>> = Lazy::new(|| Mutex::new(0));
static CANCEL_GETTING_METADATA_FLAG: Lazy<Arc<RwLock<bool>>> = Lazy::new(|| Arc::new(RwLock::new(false)));
static CANCEL_DOWNLOADING_IMAGES_STORED_IN_METADATA_FLAG: Lazy<Arc<Mutex<bool>>> = Lazy::new(|| Arc::new(Mutex::new(false)));


#[tauri::command]
pub async fn download_image (url: String, author: String, id: u32, post_id: u32, image_description: String) -> Result<String, String> {

    let config_guard = CONFIG.read().await;
    let download_dir = config_guard.download_dir.clone().unwrap();
    drop(config_guard);

    let folder_name=format!("{}/Civitai/{}",download_dir,author);

    if !Path::new(&folder_name).exists() {
        fs::create_dir_all(folder_name.clone()).map_err(|e| e.to_string())?;
    }


    let image_name = format!("{}-{}.{}",post_id.to_string(),id.to_string(),url.split('.').last().ok_or("Couldn't parse image name.").unwrap());
    let image_path_string=format!("{}/{}",folder_name,image_name);
    let image_path = Path::new(&image_path_string);

    if !image_path.exists() {
        
        //Sync variant
        /*
        let mut response = reqwest::blocking::get(url).map_err(|e| e.to_string())?;
        let mut file = File::create(image_path).map_err(|e| e.to_string())?;
        copy(&mut response, &mut file).map_err(|e| e.to_string())?;
        */

        let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
        let bytes = response.bytes().await.map_err(|e| e.to_string())?;

        let mut file = File::create(image_path).map_err(|e| e.to_string())?;
        copy(&mut &*bytes,&mut file).map_err(|e| e.to_string())?;
        
        //Adding the generation data to the EXIF tag. Not critical, so nothing happens if an error happens here.
        let metadata_result = Metadata::new_from_path(image_path).map_err(|e| e.to_string());

        match metadata_result {
            Ok(_) => {},
            Err(e) => {return Ok(format!("Imaged saved, couldn't initiate metadata: {}",e.to_string()));}
        }

        let mut metadata = metadata_result.unwrap();
        metadata.set_tag(ExifTag::ImageDescription(image_description));
        let result_of_writing_metadata = metadata.write_to_file(&image_path).map_err(|e| e.to_string());

        match result_of_writing_metadata {
            Ok(_) => {},
            Err(e) => {return Ok(format!("Imaged saved, couldn't write metadata: {}",e.to_string()));}
        }
    }

    Ok ("k".into())
}

#[tauri::command]
pub async fn get_metadata(username: &str,window: tauri::Window) -> Result<String,String> {
    if username.is_empty() {
        return Err("Empty username".into());
    }
    
    clear_metadata_of_images_to_download().await;

    let config_guard = CONFIG.read().await;
    let mut items_fetched: u32 = 0;

    let mut api_headers = reqwest::header::HeaderMap::new();
    api_headers.insert(reqwest::header::CONTENT_TYPE, "application/json".parse().unwrap());
    api_headers.insert(reqwest::header::AUTHORIZATION, format!("Bearer {}",config_guard.api_key).parse().unwrap());

    let mut api_params = HashMap::new();
    api_params.insert("limit","200"); //for testing purposes
    api_params.insert("username",username);
    api_params.insert("nsfw","X"); //weird undocumented behavior. It marks highest possible level.

    let api_url = format!("https://civitai.com/{}/images",config_guard.api_prefix);

    let next_page_reqwest_url = reqwest::Url::parse_with_params(&api_url, api_params).map_err(|e| e.to_string())?;
    let mut next_page: Option<String> = Some( next_page_reqwest_url.into() );

    while let Some(ref next_page_url) = next_page {
        //Check if canceled
        let cancel_flag = CANCEL_GETTING_METADATA_FLAG.read().await;
        if *cancel_flag {
            return Ok("Canceled from frontend.".into());
        }
        drop(cancel_flag);

        let client = reqwest::Client::new();
        let api_response = client.get(next_page_url)
                                                .headers(api_headers.clone())
                                                .send()
                                                .await;
        
        match api_response {
            Ok(_) => {},
            Err(e) => return  Err(e.to_string())
        }

        let api_response_body = api_response.unwrap().text().await.map_err(|e| {
            format!("Error getting text from request: {}.",e.to_string());
        });

        let gathered_data: ImagesAPIResponse = serde_json::from_str(&api_response_body.unwrap()).map_err(|e| {
            format!("Error parsing JSON: {}.",e.to_string())
        })?;

        next_page = gathered_data.metadata.unwrap().nextPage.clone();

        let mut images_to_download_lock = IMAGES_TO_DOWNLOAD.lock().await;

        for item in gathered_data.items {
            //images_to_download_lock.insert(item.id,item);
            images_to_download_lock.push(item);
            items_fetched += 1;
        }

        let cancel_flag = CANCEL_GETTING_METADATA_FLAG.read().await;
        if !*cancel_flag {
            let _ = window.emit("update_fetched_metadata_items",items_fetched);
        }
        drop(cancel_flag);
    }

    let mut amount_of_images_to_download_guard = AMOUNT_OF_IMAGES_TO_DOWNLOAD.lock().await;
    *amount_of_images_to_download_guard = items_fetched;

    return Ok("k".into());
}

async fn cycle_through_vector_and_download (collection: &Vec<MetadataItem>,window: tauri::Window) -> Result<String,String> {
    let mut counter_of_downloaded_images:u32 = 0;

    for item in collection.iter() {
        //Check if canceled
        let cancel_flag = CANCEL_DOWNLOADING_IMAGES_STORED_IN_METADATA_FLAG.lock().await;
        if *cancel_flag {
            return Ok("Canceled from frontend.".into());
        }
        drop(cancel_flag);

        let meta_json = serde_json::to_string(&item.meta).map_err(|e| e.to_string())?;
        let result = download_image(
                                                item.url.clone(),
                                                item.username.clone(),
                                                item.id.clone(),
                                                item.postId.clone(),
                                                meta_json).await;

        match result {
            Ok(_) => {},
            Err(e) => return Err(e.to_string()),
        }

        counter_of_downloaded_images += 1;
        let _ = window.emit("update_amount_of_downloaded_images",counter_of_downloaded_images);
    }

    return Ok("k".into());
}

async fn clear_metadata_of_images_to_download() {
    let mut previous_metadata_guard = IMAGES_TO_DOWNLOAD.lock().await;
    previous_metadata_guard.clear();
    drop(previous_metadata_guard);

    let mut cancel_getting_metadata_flag_guard = CANCEL_GETTING_METADATA_FLAG.write().await;
    *cancel_getting_metadata_flag_guard = false;
    drop(cancel_getting_metadata_flag_guard);
}

#[tauri::command]
pub async fn cancel_getting_metadata() -> Result<String,String> {
    let mut cancel_getting_metadata_flag_guard = CANCEL_GETTING_METADATA_FLAG.write().await;
    *cancel_getting_metadata_flag_guard = true;

    Ok("Cancellation requested".into())
}

#[tauri::command]
pub async fn download_images_stored_in_metadata(window: tauri::Window) -> Result<String,String> {
    let mut cancel_flag = CANCEL_DOWNLOADING_IMAGES_STORED_IN_METADATA_FLAG.lock().await;
    *cancel_flag = false;
    drop(cancel_flag);

    let amount_of_images_to_download_guard = *AMOUNT_OF_IMAGES_TO_DOWNLOAD.lock().await;
    let _ = window.emit("set_amount_of_images_to_download",amount_of_images_to_download_guard);

    //let mut counter_of_downloaded_images: u32 = 0;
    
    let images_to_download_guard = IMAGES_TO_DOWNLOAD.lock().await;

    let result = cycle_through_vector_and_download(&images_to_download_guard,window).await;

    match  result {
        Ok(_) => {},
        Err(e) => return Err(e.to_string()),
    }

    drop(images_to_download_guard);

    clear_metadata_of_images_to_download().await;
    Ok("k".into())
}

#[tauri::command]
pub async fn cancel_downloading_images_stored_in_metadata() -> Result<String,String> {
    let mut cancel_downloading_images_stored_in_metadata_flag_guard = CANCEL_DOWNLOADING_IMAGES_STORED_IN_METADATA_FLAG.lock().await;
    *cancel_downloading_images_stored_in_metadata_flag_guard = true;
    //drop(cancel_downloading_images_stored_in_metadata_flag_guard);
    Ok("Cancellation requested".into())
}

#[tauri::command]
pub async fn download_images_from_frontend(window: tauri::Window,images_meta_json_str: &str) -> Result<String,String> {
    let mut cancel_flag = CANCEL_DOWNLOADING_IMAGES_STORED_IN_METADATA_FLAG.lock().await;
    *cancel_flag = false;
    drop(cancel_flag);

    let images_meta: Vec<MetadataItem> = serde_json::from_str(images_meta_json_str).map_err(|e| e.to_string())?;
    
    let result = cycle_through_vector_and_download(&images_meta,window).await;

    match  result {
        Ok(_) => {},
        Err(e) => return Err(e.to_string()),
    }

    return Ok("k".into());
}
