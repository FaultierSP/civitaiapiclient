import { useState } from "react";
import { Blurhash } from "react-blurhash";

import { fetch, ResponseType } from "@tauri-apps/api/http";
import {
    Flex, Divider, Table, Image, Modal, Tooltip,
    Form, Input, InputNumber, Select, Button,
} from "antd";
import { MessageOutlined, LikeOutlined, DislikeOutlined, HeartOutlined, SmileOutlined, FrownOutlined } from "@ant-design/icons";

import ImageDownloader from "./ImageDownloader";

import dayjs from "dayjs";

const Images = (props) => {
    //UI
    const nsfwLevelSelectOptions=[
        {
            value:"None",
            label:"None",
        },
        {
            value:"Soft",
            label:"Soft",
        },
        {
            value:"Mature",
            label:"Mature",
        },
        {
            value:"X",
            label:"X",
        },
        {
            value:true,
            label:"Only NSFW"
        },
    ];

    const periodSelectOptions=[
        {
            value:"AllTime",
            label:"All time"
        },
        {
            value:"Year",
            label:"Year"
        },
        {
            value:"Month",
            label:"Month"
        },
        {
            value:"Week",
            label:"Week"
        },
        {
            value:"Day",
            label:"Day"
        }
    ];
    const sortBySelectOptions=[
        {
            value:"Most Reactions",
            label:"Most reactions"
        },
        {
            value:"Most Comments",
            label:"Most comments"
        },
        {
            value:"Newest",
            label:"Newest"
        }
    ]
    const initialValuesOfTheForm={
        "nsfw":"X",
        "period":"AllTime",
        "sort":"Newest",
        "limit":0,
    };
    const [formHandle]=Form.useForm();
    const [awaitingResponse,setAwaitingResponse]=useState(false);
    const imagesTableColumns=[
        {
            title:"Preview",
            dataIndex:"hash",
            render: (hash,row) => (
                <Image width={60} src={row.url} placeholder={(<Blurhash
                                                                hash={hash}
                                                                width={60}
                                                                height={60}
                                                                />)
                                                            } />
            ),
        },
        {
            title:"Creator",
            dataIndex:"username",
            sorter: (a,b) => a.username.localeCompare(b.username),
            render: (username) =>   <Tooltip title="Click to search by creator's name.">
                                        <a onClick={fillCreatorsUsername}>{username}</a>
                                    </Tooltip>
        },
        {
            title:"Post",
            dataIndex:"postId",
            render: (id) => <Tooltip title="Click to search all images from this post.">
                                <a onClick={fillPostID}>{id}</a>
                            </Tooltip>,
            sorter: (a,b) => a.postId-b.postId,
        },
        {
            title:"NSFW",
            dataIndex:"nsfwLevel",
            sorter: (a,b) => a.nsfwLevel.localeCompare(b.nsfwLevel),
        },
        {
            title:"Width",
            dataIndex:"width",
            sorter: (a,b) => a.width-b.width,
        },
        {
            title:"Height",
            dataIndex:"height",
            sorter: (a,b) => a.height-b.height,
        },
        {
            title:"Created at",
            dataIndex:"createdAt",
            render: (dateString) => (dayjs(dateString).format("D MMM YYYY, H:mm")),
            sorter: (a,b) => dayjs(a.createdAt).diff(b.createdAt),
        },
        {
            title:"Reactions",
            dataIndex:"stats",
            render: (stats) => (generateEmojis(stats))
        }
    ];
    const [imagesTableData,setImagesTableData]=useState([]);
    const [selectedTableRows, setSelectedTableRows] = useState([]);
    const [downloadButtonDisabled,setDownloadButtonDisabled]=useState(true);
    const [loadMoreButtonDisabled,setLoadMoreButtonDisabled]=useState(true);
    const [loadMoreAPIURL,setLoadMoreAPIURL]=useState('');
    const [loadMoreButtonAwaiting,setLoadMoreButtonAwaiting]=useState(false);
    const [downloadProgressModalOpen,setDownloadProgressModalOpen]=useState(false);

    const rowSelection = {
        onChange: (selectedRowKeys,selectedRows) => {
            setSelectedTableRows(selectedRows);

            if(selectedRowKeys.length>0) {
                setDownloadButtonDisabled(false);
            }
            else {
                setDownloadButtonDisabled(true);
            }
        }
      };


    const generateEmojis = (stats) => {
        return(
            <Flex>
                <span><MessageOutlined /> {stats.commentCount}</span>
                <span><LikeOutlined /> {stats.likeCount}</span>
                <span><DislikeOutlined /> {stats.dislikeCount}</span>
                <span><HeartOutlined /> {stats.heartCount}</span>
                <span><SmileOutlined /> {stats.laughCount}</span>
                <span><FrownOutlined /> {stats.cryCount}</span>
            </Flex>
        );
    }

    //API
    const api_prefix=props.globalSettings.api_prefix;
    const api_config={
        'Content-Type': 'application/json',
        'Authorization':'Bearer '+props.globalSettings.api_key,
    };

    //Logic
    const fillCreatorsUsername = (element) => {
        formHandle.setFieldValue("username",element.target.firstChild.data);
    }

    const fillPostID = (element) => {
        formHandle.setFieldValue("postId",element.target.firstChild.data);
    }

    const handleFormSubmit = (data) => {
        setAwaitingResponse(true);

        for(const [key,value] of Object.entries(data)) {
            if(typeof(value)=="undefined") {
                delete data[key];
            }
            else if (value.length==0) {
                delete data[key];
            }

            if(key=="limit" && (value==null || value==0)) {
                delete data["limit"];
            }            
        }

        console.log(api_config);
        console.log(data);

        fetch('https://civitai.com'+api_prefix+'images',{
            method:'GET',
            query:data,
            responseType:ResponseType.JSON,
            headers:api_config
        })
            .then((response) => {
                if (response.data.metadata.nextPage) {
                    setLoadMoreAPIURL(response.data.metadata.nextPage);
                    setLoadMoreButtonDisabled(false);
                }
                else {
                    setLoadMoreButtonDisabled(true);
                }
                setImagesTableData(response.data.items);
                setDownloadButtonDisabled(true);
                //setSelectedRowKeys([]);
            })
            .catch((error) => {
                if(typeof error!=undefined) {
                    props.showErrorMessage(error.response.data.error);
                }
            })
            .finally(()=>{
                setAwaitingResponse(false);
            })
    }

    const preventEmptyLimitField = (value) => {
        if (value==null) {
            formHandle.setFieldValue("limit",0);
        }
    }

    const resetFields = () => {
        formHandle.resetFields();
        setImagesTableData([]);
        setDownloadButtonDisabled(true);
        setLoadMoreButtonDisabled(true);
        setSelectedTableRows([]);
    }

    const downloadSelectedImages = async () => {
        setDownloadProgressModalOpen(true);
    }

    const closeDownloadProgressModal = () => {
        setDownloadProgressModalOpen(false);
    }

    const loadMoreImages = () => {
        setLoadMoreButtonAwaiting(true);

        fetch(loadMoreAPIURL,{headers:api_config})
            .then((response)=>{
                setImagesTableData((imagesTableData)=>[...imagesTableData,...response.data.items]);

                if (response.data.metadata.nextPage) {
                    setLoadMoreAPIURL(response.data.metadata.nextPage);
                    setLoadMoreButtonDisabled(false);
                }
                else {
                    setLoadMoreButtonDisabled(true);
                }
            })
            .catch((error) => {
                if(typeof error!=undefined) {
                    props.showErrorMessage(error.response.data.error);
                }
            })
            .finally(()=> {
                setLoadMoreButtonAwaiting(false);
            });
    }

    return(
        <Flex vertical>
            <Modal
                open={downloadProgressModalOpen}
                onCancel={closeDownloadProgressModal}
                title="Downloading..."
                footer={null}
                destroyOnClose={true}
            >
                <ImageDownloader
                    selectedTableRows={selectedTableRows}
                    downloadProgressModalOpen={downloadProgressModalOpen}
                    closeDownloadProgressModal={closeDownloadProgressModal}
                    showSuccessMessage={props.showSuccessMessage}
                    showWarningMessage={props.showWarningMessage}
                    showErrorMessage={props.showErrorMessage}
                    />
            </Modal>
            <Divider orientation="left">Query</Divider>
            <Form
                form={formHandle}
                initialValues={initialValuesOfTheForm}
                onFinish={handleFormSubmit}
            >
                <Flex gap="large" wrap>
                    <Form.Item label="Username" name="username">
                        <Input/>
                    </Form.Item>
                    <Form.Item label="NSFW" name="nsfw">
                        <Select options={nsfwLevelSelectOptions} style={{width:120}}/>
                    </Form.Item>
                    <Form.Item label="Period" name="period">
                        <Select options={periodSelectOptions}/>
                    </Form.Item>
                    <Form.Item label="Sort by" name="sort" style={{width:200}}>
                        <Select options={sortBySelectOptions}/>
                    </Form.Item>
                </Flex>
                <Flex gap="large">
                    <Form.Item label="Model ID" name="modelId">
                        <Input/>
                    </Form.Item>
                    <Form.Item label="Model Version" name="modelVersionId">
                        <Input/>
                    </Form.Item>
                    <Form.Item label="Post ID" name="postId">
                        <Input/>
                    </Form.Item>
                </Flex>
                <Flex gap="large">
                    <Form.Item label="Limit" name="limit">
                        <InputNumber min={0} max={200} onChange={preventEmptyLimitField}/>
                    </Form.Item>
                </Flex>
                <Flex gap="small">
                    <Button onClick={resetFields}>Clear</Button>
                    <Button htmlType="submit" type="primary" loading={awaitingResponse}>Search</Button>
                    <Button onClick={downloadSelectedImages} disabled={downloadButtonDisabled}>Download selected ({selectedTableRows.length})</Button>
                    <Button onClick={loadMoreImages} disabled={loadMoreButtonDisabled} loading={loadMoreButtonAwaiting}>Load more</Button>
                </Flex>
            </Form>
            <Divider orientation="left">Found images</Divider>
            <Image.PreviewGroup>
                <Table
                    loading={awaitingResponse}
                    dataSource={imagesTableData}
                    columns={imagesTableColumns}
                    scroll={{y:'calc(50vh)'}}
                    rowKey='id'
                    rowSelection={rowSelection}
                    pagination={{
                        showSizeChanger:true,
                        pageSizeOptions:['10','20','50','100','200'],
                    }}
                />
            </Image.PreviewGroup>
        </Flex>
    );
}

export default Images;