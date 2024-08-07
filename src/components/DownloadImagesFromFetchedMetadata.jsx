import { useState, useEffect, useRef } from "react";
import { Flex, Progress, Button, Result } from "antd";
import { 
    ArrowLeftOutlined,
    CloseCircleOutlined,
    CloseCircleFilled,
    LoadingOutlined,
    CheckCircleFilled,
} from "@ant-design/icons";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

const DownloadImagesFromFetchedMetadata = (props) => {
    //UI
    const [resultIcon,setResultIcon] = useState();
    const [resultTitle,setResultTitle] = useState();
    const [resultSubTitle,setResultSubTitle] = useState();
    const [resultSubTitle1,setResultSubTitle1] = useState("");
    const [resultSubTitle2,setResultSubTitle2] = useState("");
    const [resultStatus,setResultStatus] = useState();
    const [progressPercentage,setProgressPercentage] = useState(0);
    const [startOverButtonDisabled,setStartOverButtonDisabled] = useState(true);
    const [cancelButtonDisabled,setCancelButtonDisabled] = useState(false);
    const progressBarRef = useRef(null);
    const timeFormat = 'HH:mm:ss';

    const buttonWidth = 120;
    const resultExtra = (
        <Flex vertical gap="middle">
            <Progress percent={progressPercentage} ref={progressBarRef}></Progress>

            <Flex justify="center" gap="small">
                <Button onClick={() => props.startOver()} style={{width:buttonWidth}} disabled={startOverButtonDisabled} icon={<ArrowLeftOutlined/>}>Start over</Button>
                <Button onClick={() => handleCancelClicked()} style={{width:buttonWidth}} disabled={cancelButtonDisabled}>Cancel</Button>
            </Flex>
        </Flex>
    );

    //Logic
    dayjs.extend(duration);
    const initialized = useRef(false); //I freaking love React's strict mode. Not.
    const scriptStartedAt = useRef(dayjs());
    const amountOfImages = useRef(0);
    const imageCounter = useRef(0);
    const canceledRef = useRef(false);
    const jobEnded = useRef(false);
    let intervalOfKeepingTimeRef = useRef();

    async function downloadImages() {
        
        setResultIcon(<LoadingOutlined/>);
        setResultStatus("info");
        setResultTitle("Downloading images");
        setResultSubTitle("Start downloading.");

        setCancelButtonDisabled(false);

        invoke("download_images_stored_in_metadata")
            .then((response) => {
                if (!canceledRef.current) {
                    jobFinished();
                    //console.log(response);
                }
            })
            .catch((error) => {
                jobFailed("Error",error);
                //console.error(error);
            });
    }

    function keepTime() {
        const millisecondsElapsed = dayjs()-scriptStartedAt.current;

        let subtitle2 = "Time elapsed: "+dayjs.duration(millisecondsElapsed).format(timeFormat)+".";

        if(imageCounter.current > 0) {
            const millisecondsPerImage = Math.floor(millisecondsElapsed / imageCounter.current);
            const imagesLeft = amountOfImages.current - imageCounter.current;
            const millisecondsLeft = imagesLeft * millisecondsPerImage;

            subtitle2 += " Time left: "+dayjs.duration(millisecondsLeft).format(timeFormat)+".";
        }

        setResultSubTitle2(subtitle2);

    }

    function updateProgress(imagesDownloaded = 0) {
        if(!canceledRef.current) {
            imageCounter.current = imagesDownloaded;

            let subtitle1 = "Downloaded " + imagesDownloaded + " from " + amountOfImages.current + " images.";

            setResultSubTitle1(subtitle1);
            setProgressPercentage(Math.floor(imagesDownloaded/amountOfImages.current*100));
        }
    }

    function handleCancelClicked() {
        canceledRef.current=true;
        jobEnded.current = true;
        
        clearInterval(intervalOfKeepingTimeRef.current);
        intervalOfKeepingTimeRef.current = null;

        invoke("cancel_downloading_images_stored_in_metadata")
            .then((response) => {
                //console.log(response);
            })
            .catch((error) => {
                //console.error(error);
            });
            

        setResultIcon(<CloseCircleOutlined/>);
        setResultTitle("Canceled");
        setResultSubTitle1("");
        setResultSubTitle2("");
        setResultStatus("warning");

        setStartOverButtonDisabled(false);
        setCancelButtonDisabled(true);
    }

    function jobFailed(message, error = "") {
        jobEnded.current = true;

        clearInterval(intervalOfKeepingTimeRef.current);
        intervalOfKeepingTimeRef.current = null;
        
        setResultIcon(<CloseCircleFilled/>);
        setResultStatus('error');
        setResultTitle(message);
        setResultSubTitle1(error);
        setResultSubTitle2("");

        setStartOverButtonDisabled(false);
        setCancelButtonDisabled(true);
    }

    function jobFinished() {
        jobEnded.current = true;

        clearInterval(intervalOfKeepingTimeRef.current);
        intervalOfKeepingTimeRef.current = null;

        setResultIcon(<CheckCircleFilled/>);
        setResultStatus("success");
        setResultTitle("Done");

        setResultSubTitle1("Downloaded " + imageCounter.current + " from " + amountOfImages.current + " images.");
        setResultSubTitle2("");
        setProgressPercentage(100);

        setStartOverButtonDisabled(false);
        setCancelButtonDisabled(true);
    }

    async function goListen() {
        await listen("set_amount_of_images_to_download",(event)=>{
            amountOfImages.current=event.payload;
        });

        await listen("update_amount_of_downloaded_images",(event)=>{
            updateProgress(event.payload);
        });
    }

    useEffect(()=>{
        if(!initialized.current) {
            initialized.current = true;
            goListen();
            downloadImages();
        }

        return () => {
            clearInterval(intervalOfKeepingTimeRef.current);
            intervalOfKeepingTimeRef.current = null;
        };
    },[]);

    useEffect(()=>{
        if (!jobEnded.current) {
            intervalOfKeepingTimeRef.current = setInterval(keepTime,1000);
        }
    },[intervalOfKeepingTimeRef]);

    return  <Result
        title={resultTitle}
        subTitle={ (resultSubTitle1 + " " + resultSubTitle2) }
        status={resultStatus}
        icon={resultIcon}
        extra={resultExtra}
    />;
}

export default DownloadImagesFromFetchedMetadata;