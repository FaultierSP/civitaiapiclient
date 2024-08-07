import { useState, useRef } from "react";
import { Flex, Steps, Card } from "antd";

import SearchCreatorsOfImages from "./SearchCreatorsOfImages";
import FetchMetadataOfImages from "./FetchMetadataOfImages";
import DownloadImagesFromFetchedMetadata from "./DownloadImagesFromFetchedMetadata";

const CreatorsImagesDownloader = (props) => {
    //const [username,setUsername] = useState();

    const username = useRef();
    const metadataRef = useRef(new Map());

    const stepItems = [
        {
            title:'Search',
            description:'and select a creator',
        },
        {
            title:'Fetch',
            description:'metadata of images',
        },
        {
            title:'Download',
            description:'all images',
        },

    ];
    const stepsContent = [
        {
            content:<SearchCreatorsOfImages
                        globalSettings={props.globalSettings}
                        fetchMetadataInParent = {fetchMetadata}
                    />,
        },
        {
            content:<FetchMetadataOfImages
                        globalSettings={props.globalSettings}
                        username={username.current}
                        goBack={goFromFetchingToSearching}
                        download={goFromSearchingToDownloading}
                        collectMetadata={collectMetadata}
                    />
        },
        {
            content:<DownloadImagesFromFetchedMetadata
                        globalSettings={props.globalSettings}
                        metadata={metadataRef.current}
                        startOver={startOver}
                    />
        }
    ];
    const [currentStepItem,setCurrentStepItem] = useState(0);

    function fetchMetadata(passed_username) {
        if(passed_username) {
            username.current=passed_username;
            
            setCurrentStepItem(1);
            metadataRef.current = new Map();
        }
    }

    function collectMetadata(data) {
        const newMetadataItems = Object.values(data).map(value => ({
            id:value.id,
            url: value.url,
            username: value.username,
            imageDescription: JSON.stringify(value.meta, null, 2)
        }));
    
        newMetadataItems.forEach(item => {
            metadataRef.current.set(item.id,item);
        });
    }

    function goFromFetchingToSearching() {
        setCurrentStepItem(0);
    }

    function goFromSearchingToDownloading() {
        setCurrentStepItem(2);
    }

    function startOver() {
        setCurrentStepItem(0);
        username.current = "";
        metadataRef.current = new Map();
    }

    return <Flex vertical gap="small">
        <Steps items={stepItems} current={currentStepItem}/>
        <Card>{stepsContent[currentStepItem].content}</Card>
    </Flex>;
}

export default CreatorsImagesDownloader;