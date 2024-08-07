import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";

import { Space, Button, Result } from "antd";
import { 
    ArrowRightOutlined,
    ArrowLeftOutlined,
    CloseCircleOutlined,
    CloseCircleFilled,
    LoadingOutlined,
    CheckCircleFilled,
} from "@ant-design/icons";

import ProgressButton from "./ProgressButton";

const FetchMetadataOfImages = (props) => {
    //UI
    const [resultIcon,setResultIcon] = useState();
    const [resultTitle,setResultTitle] = useState();
    const [resultSubTitle,setResultSubTitle] = useState();
    const [resultStatus,setResultStatus] = useState();
    const [goBackButtonDisabled,setGoBackButtonDisabled] = useState(true);
    const [cancelButtonDisabled,setCancelButtonDisabled] = useState(false);
    const [downloadButtonDisabled,setDownloadButtonDisabled] = useState(true);
    const [triggerDownloadButtonTime,setTriggerDownloadButtonTime] = useState(false);
    const buttonWidth = 120;
    const resultButtons = (<Space>
        <Button onClick={() => goBack()} icon={<ArrowLeftOutlined/>} style={{width:buttonWidth}} disabled={goBackButtonDisabled}>Back</Button>
        <Button onClick={() => handleCancelClicked()} icon={<CloseCircleOutlined/>} style={{width:buttonWidth}} disabled={cancelButtonDisabled}>Cancel</Button>
        <ProgressButton
            text={"Download"}
            timer={3}
            trigger={triggerDownloadButtonTime}
            disabled={downloadButtonDisabled}
            style={{width:buttonWidth}}
            onClick={props.download}
            callback={props.download}
        />
    </Space>);

    //Logic
    const initialized = useRef(false); //I freaking love React's strict mode. Not.
    const canceledRef = useRef(false);

    function goBack() {
        setTriggerDownloadButtonTime(false);

        props.goBack();
    }

    function handleCancelClicked() {
        canceledRef.current=true;

        setResultIcon(<CloseCircleOutlined/>);
        setResultTitle("Canceled");
        setResultSubTitle(null);
        setResultStatus("warning");

        setGoBackButtonDisabled(false);
        setCancelButtonDisabled(true);
        setDownloadButtonDisabled(true);

        invoke("cancel_getting_metadata")
            .then((response) => {
                //console.log(response);
            })
            .catch((error) => {
                //console.error(error);
            }) 
    }

    async function startLoop() {
        //console.clear();

        invoke("get_metadata",{username:props.username})
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

    function jobFailed(message, error = "") {

        setResultIcon(<CloseCircleFilled/>);
        setResultStatus('error');
        setResultTitle(message);
        setResultSubTitle(error);

        setGoBackButtonDisabled(false);
        setCancelButtonDisabled(true);
        setDownloadButtonDisabled(true);
    }

    function jobFinished() {

        setResultIcon(<CheckCircleFilled/>);
        setResultStatus("success");
        setResultTitle("Done");

        setGoBackButtonDisabled(false);
        setCancelButtonDisabled(true);
        setDownloadButtonDisabled(false);

        setTriggerDownloadButtonTime(true);
    }

    async function goListen() {
        await listen("update_fetched_metadata_items",(event)=>{
            setResultSubTitle("Fetched metadata for " + event.payload + " images");
        });
    }

    useEffect(()=>{
        if(!initialized.current) {
            initialized.current=true;
            
            setResultIcon(<LoadingOutlined/>);
            setResultStatus("info");
            setResultTitle("Loading metadata");

            setGoBackButtonDisabled(true);
            setCancelButtonDisabled(false);
            setDownloadButtonDisabled(true);

            goListen();

            startLoop();
        }
    },[]);

    return  <Result
                title={resultTitle}
                subTitle={resultSubTitle}
                status={resultStatus}
                icon={resultIcon}
                extra={resultButtons}
            />;
}

export default FetchMetadataOfImages;