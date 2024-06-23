import { forwardRef, useImperativeHandle, useEffect } from "react";

import { Form, Input, Button } from "antd";

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

    useEffect(()=> {
        settingsFormHandle.setFieldValue("api_key",props.initialValues.api_key);
        settingsFormHandle.setFieldValue("api_prefix",props.initialValues.api_prefix);
    },[settingsFormHandle]);

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
            <Form.Item wrapperCol={{offset:formLabelWrapperCols,span:formInputWrapperCols}}>
                <Button type="primary" htmlType="submit">Save</Button>
            </Form.Item>
        </Form>
    );
});

export default SettingsForm;