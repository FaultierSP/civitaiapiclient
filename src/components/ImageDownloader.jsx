import { useState, useEffect, useRef } from "react";
import { Flex, Progress } from "antd";
import { invoke } from "@tauri-apps/api/tauri";

const ImageDownloader = (props) => {
    const [progressPercentage,setProgressPercentage]=useState(0);
    const downloadStarted = useRef(false);
    const progressPercentageRef = useRef(null);

    const startDownloading = async () => {
        setProgressPercentage(0);
        downloadStarted.current=true;

        let numberOfImagesToDownload=props.selectedTableRows.length;
        let counter=0;

        // Add a brief delay to ensure the modal is rendered
        await new Promise(resolve => setTimeout(resolve, 800));

        for (const value of props.selectedTableRows) {
            try {
                await invoke("download_image", {
                    url:value.url,
                    author:value.username,
                    imageDescription:JSON.stringify(value.meta,null,2)
                }).then((response) => {
                    //console.log(response);
                });

                counter++;
                setProgressPercentage(Math.floor(counter/numberOfImagesToDownload*100));
            }
            catch (error) {
                props.showErrorMessage("Couldn't download image: "+error);
                console.error(error);
            }
        }

        props.showSuccessMessage("Downloaded "+counter+" images.");
        props.closeDownloadProgressModal();
        downloadStarted.current=false;
    }

    useEffect(()=>{
        //console.log('useEffect triggered:', props.downloadProgressModalOpen);
        if(props.downloadProgressModalOpen && !downloadStarted.current) {
            startDownloading();
        }
    },[progressPercentageRef]);

    return (
        <Flex vertical>
            <Progress percent={progressPercentage} ref={progressPercentageRef}></Progress>
        </Flex>);
}

export default ImageDownloader;