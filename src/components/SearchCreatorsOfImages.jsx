import { useState, useEffect } from "react";
import { fetch, ResponseType } from "@tauri-apps/api/http";

import { Flex, Space, Form, Input, Button, Result } from "antd";
import { SearchOutlined, ArrowRightOutlined } from "@ant-design/icons";

const SearchCreatorsOfImages = (props) => {
    const [formHandle] = Form.useForm();
    const formValues = Form.useWatch([],formHandle);
    const [searchButtonDisabled,setSearchButtonDisabled] = useState(true);
    const [awaitingAPIResponse,setAwaitingAPIResponse] = useState(false);
    const [resultTitle,setResultTitle] = useState();
    const [resultSubTitle,setResultSubTitle] = useState();
    const [resultStatus,setResultStatus] = useState();
    const [resultButtons,setResultButtons] = useState(null);
    const [resultVisible,setResultVisible] = useState(false);

    //API
    const api_prefix=props.globalSettings.api_prefix;
    const api_config={
        'Content-Type': 'application/json',
        'Authorization':'Bearer '+props.globalSettings.api_key,
    };

    function getFirstBatchOfImages() {
        setAwaitingAPIResponse(true);
        setResultVisible(false);

        const data = {
            //limit:1, //for test purposes
            username: formHandle.getFieldValue("username"),
            period: "AllTime",
            sort: "Newest",
            nsfw: 'X', //weird undocumented behavior
        };

        fetch('https://civitai.com/'+api_prefix+'images', {
            method: 'GET',
            query: data,
            responseType: ResponseType.JSON,
            headers: api_config,
        })
        .then((response) => {
            if(response.status !== 200) {
                if (typeof response.data.error === 'object') {
                    let error_message = "";

                    Object.entries(response.data.error.issues).forEach(([key, value]) => {
                        error_message += value.message + "\n";
                    });

                    setResultTitle(error_message);
                } else {
                    setResultTitle(response.data.error);
                }
                
                setResultSubTitle(null);
                setResultStatus("warning");
                setResultButtons(null);
                setResultVisible(true);

                return;
            }

            if(response.data.items.length == 0 ) {
                setResultTitle("Couldn't find any images by this creator.");
                setResultSubTitle(null);
                setResultStatus("warning");
                setResultButtons(null);
                setResultVisible(true);
            }
            else {
                let message = "Creator " + response.data.items[0].username + " has "+response.data.items.length;

                if (response.data.metadata.nextPage) {
                    message += "+";
                }

                message += " images."

                setResultTitle(message);
                setResultSubTitle("We can fetch metadata now.");
                setResultStatus("success");
                setResultButtons(<Button
                                    icon={<ArrowRightOutlined/>}
                                    onClick={() => props.fetchMetadataInParent(response.data.items[0].username)}>Go
                                </Button>);
                setResultVisible(true);
            }
        })
        .catch((error) => {
            setResultTitle(error.message);
            
            /*if(error.response && error.response.data && error.response.data.error) {
                setResultSubTitle(error.response.data.error);
            }
            else {
                setResultSubTitle(null);
            }*/

            setResultStatus("error");
            setResultButtons(null);
            setResultVisible(true);
        })
        .finally(() => {
            setAwaitingAPIResponse(false);
        });
    }

    useEffect(()=>{
        formHandle.validateFields({ validateOnly:true })
            .then(()=> setSearchButtonDisabled(false) )
            .catch(()=> setSearchButtonDisabled(true) );
    },[formHandle,formValues]);

    return (
        <Flex vertical>
        <Form
                form={formHandle}
                onFinish={getFirstBatchOfImages}
            >
        <Space.Compact>
            <Form.Item name="username" rules={[{ required:true }]} help={null}>
                <Input/>
            </Form.Item>
            <Button
                type="primary"
                icon={<SearchOutlined/>}
                disabled={searchButtonDisabled}
                loading={awaitingAPIResponse}
                onClick={getFirstBatchOfImages}>
                    Search
            </Button>
        </Space.Compact>
        </Form>
        <Result
            title={resultTitle}
            subTitle={resultSubTitle}
            status={resultStatus}
            style={{visibility:(resultVisible ? "visible" : "hidden")}}
            extra={resultButtons}
        />
        </Flex>
    );
}

export default SearchCreatorsOfImages;