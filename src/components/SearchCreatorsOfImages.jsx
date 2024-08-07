import { useState, useEffect } from "react";
import axios from "axios";

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
        //console.clear();

        setAwaitingAPIResponse(true);
        setResultVisible(false);

        const data = {
            //limit:1, //for test purposes
            username: formHandle.getFieldValue("username"),
            nsfw: 'X', //weird undocumented behavior
        };

        axios.get('https://civitai.com/'+api_prefix+'images',{params:data,headers:api_config})
            .then((response) => {
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
                
                if(error.response.data.error) {
                    setResultSubTitle(error.response.data.error);
                }
                else {
                    setResultSubTitle(null);
                }

                setResultStatus("error");
                setResultButtons(null);
                setResultVisible(true);
            })
            .finally(() => {
                setAwaitingAPIResponse(false);
            });
    }

    function goFetchMetadata() {

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