import { useState, useEffect } from "react";
import axios from "axios";

import {
    Flex, Divider, Space, Table, 
    Form, Input, Button
} from "antd";
import { SearchOutlined } from '@ant-design/icons';

const Creators = (props) => {
    const [usernameFormHandle]=Form.useForm();
    const [searchButtonSubmittable,setSearchButtonSubmittable]=useState(false);
    const [searchButtonLoading,setSearchButtonLoading]=useState(false);
    const usernameFormValues=Form.useWatch([],usernameFormHandle);
    const foundCreatorsTableColumns=[
        {
            title:'Username',
            dataIndex:'username',
            key:'username'
        },
        {
            title:'Published models',
            dataIndex:'modelCount',
        },
    ];
    const [foundCreatorsTableData,setFoundCreatorsTableData]=useState([]);

    //API
    const api_prefix=props.globalSettings.api_prefix;
    const api_config={
            'Content-Type': 'application/json',
            'Authorization':'Bearer '+props.globalSettings.api_key,
    };

    const searchByUsername = (data) => {
        let params={
            query:data.username,
        }

        setSearchButtonLoading(true);
        axios.get('https://civitai.com'+api_prefix+'creators',{params:params,headers:api_config})
            .then((response) => {
                if(response.data.metadata.totalItems>0) {
                    console.log(response.data);
                    setFoundCreatorsTableData(response.data.items)
                }
                else {
                    setFoundCreatorsTableData([]);
                }
            })
            .catch((error) => {
                props.showErrorMessage(error.message);
                console.error(error);
            })
            .finally(()=>{
                setSearchButtonLoading(false);
            });
    }

    useEffect(()=>{
        usernameFormHandle.validateFields({validateOnly:true},)
                            .then(() => {setSearchButtonSubmittable(true)})
                            .catch(() => {setSearchButtonSubmittable(false)});
    },[usernameFormHandle,usernameFormValues]);

    return (
        <Flex vertical>
            <Divider orientation="left">Find a creator</Divider>
            <Form
                form={usernameFormHandle}
                onFinish={searchByUsername}
                name="usernameForm"
                >
                <Form.Item name="username" rules={[{required:true}]} help="Username is required">
                    <Space.Compact>
                        <Input /><Button
                            icon={<SearchOutlined/>}
                            type="primary"
                            htmlType="submit"
                            disabled={!searchButtonSubmittable}
                            loading={searchButtonLoading}
                            >Search</Button>
                    </Space.Compact>
                </Form.Item>
            </Form>
            <Divider orientation="left">Found creators</Divider>
            <Table
                dataSource={foundCreatorsTableData}
                columns={foundCreatorsTableColumns}
                scroll={{y:'calc(50vh)'}}
                pagination={{pageSize:8}}
                loading={searchButtonLoading}
                rowKey="username"
                />
        </Flex>
    );
}

export default Creators;