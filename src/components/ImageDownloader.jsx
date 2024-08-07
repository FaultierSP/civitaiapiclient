import { useState, useEffect, useRef } from "react";
import { Flex, Progress, Button } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { blue } from '@ant-design/colors';
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";

const ImageDownloader = (props) => {
    const [progressPercentage,setProgressPercentage]=useState(0);
    const initialized = useRef(false); //I freaking love React's strict mode. Not.
    const numberOfImagesToDownloadRef = useRef(0);
    const numberOfImagesDownloadedRef = useRef(0);

    function replaceStingsWithNumbers(key,value) {
        const numValue = Number(value);

        if (typeof value === "string" && !Number.isNaN(numValue)) {
            return Number(value);
        }

        return value;
    }

    async function updateProgress(numberOfImagesDownloaded) {
        numberOfImagesDownloadedRef.current = numberOfImagesDownloaded;

        setProgressPercentage(Math.floor(numberOfImagesDownloaded / numberOfImagesToDownloadRef.current*100));
    }

    async function startDownloading() {
        //console.clear();

        numberOfImagesToDownloadRef.current = props.selectedTableRows.length;

        let data = JSON.stringify(props.selectedTableRows,replaceStingsWithNumbers);

        await invoke("download_images_from_frontend",{imagesMetaJsonStr:data})
            .then((response) => {
                props.showSuccessMessage("Downloaded "+numberOfImagesDownloadedRef.current+" images.");
                props.closeDownloadProgressModal();

                //console.log(response);
            })
            .catch((error) => {
                props.showErrorMessage("Couldn't download image: "+error);

                //console.error(error);
            })
            .finally();
    }

    async function goListen() {
        await listen("update_amount_of_downloaded_images",(event)=>{
            updateProgress(event.payload);
        });
    }

    function cancelDownloading() {
        invoke("cancel_downloading_images_stored_in_metadata")
            .then((response)=>{
                //console.log(response);
            })
            .catch((error)=>{
                //console.error(error);
            })

        props.showWarningMessage("Download canceled.");
        props.closeDownloadProgressModal();
    }

    useEffect(()=>{
        if(!initialized.current) {
            initialized.current = true;

            goListen();
            startDownloading();
        }
    },[]);

    return (
        <Flex vertical gap="middle" align="center">
            <LoadingOutlined style={{fontSize:"8vh",color:blue.primary}}/>
            <Progress percent={progressPercentage}></Progress>
            <div>Downloaded {numberOfImagesDownloadedRef.current} from {numberOfImagesToDownloadRef.current} images.</div>
            <Flex justify="center">
                <Button type="primary" onClick={cancelDownloading}>Cancel</Button>
            </Flex>
        </Flex>);
}

export default ImageDownloader;