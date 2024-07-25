import { forwardRef, useImperativeHandle, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { open } from '@tauri-apps/api/dialog';
import { downloadDir } from '@tauri-apps/api/path';

import { Form, Input, Button, Space } from "antd";

const SettingsForm = forwardRef((props,ref) => {
    useImperativeHandle(ref, () => ({
        clearForm() {
            settingsFormHandle.resetFields();
        },
        getFormData() {
            return settingsFormHandle.getFieldsValue(true);
        }
    }));

    const formLabelWrapperCols=4;
    const formInputWrapperCols=16;

    const [settingsFormHandle] = Form.useForm();

    useEffect(() => {
        settingsFormHandle.setFieldsValue({
            api_key: props.initialValues.api_key,
            api_prefix: props.initialValues.api_prefix,
            download_dir: props.initialValues.download_dir
        });
    }, [settingsFormHandle]);

    const handleDirectoryPick = async () => {
        const selected = await open({
            directory:true,
            multiple:false,
            defaultPath:props.initialValues.download_dir,
        });

        if(selected) {
            settingsFormHandle.setFieldValue("download_dir",selected);
        }
        else {
            settingsFormHandle.setFieldValue("download_dir",props.initialValues.download_dir);
        }
    };

    return (
        <Form
            labelCol={{span:formLabelWrapperCols}}
            wrapperCol={{span:formInputWrapperCols}}
            form={settingsFormHandle}
            name="settingsForm"
            onFinish={props.sendDataToParent}
            >
            <Form.Item label='API key' name='api_key'>
                <Input/>
            </Form.Item>
            <Form.Item label='API prefix' name='api_prefix'>
                <Input/>
            </Form.Item>
            <Form.Item label='Download directory'>
                <Space.Compact block>
                    <Form.Item name='download_dir'>
                        <Input readOnly/>
                    </Form.Item>
                    <Button type="default" onClick={handleDirectoryPick}>Select</Button>
                </Space.Compact>
            </Form.Item>
            <Form.Item wrapperCol={{offset:formLabelWrapperCols,span:formInputWrapperCols}}>
                <Button type="primary" htmlType="submit">Save</Button>
            </Form.Item>
        </Form>
    );
});

export default SettingsForm;