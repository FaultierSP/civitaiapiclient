import { useState, useEffect, useRef } from "react";
import { Space, Button, Progress } from "antd";

const ProgressButton = (props) => {
    const [percentage,setPercentage] = useState(0);
    const defaultStyle = {
        position: 'relative',
        padding: '10px 40px',
        paddingLeft: '58px',
    };

    let intervalIdRef = useRef(null);

    async function countTo100 (time, increaseBy = 1) {
        const intervalTime = time * 10 * increaseBy; // * 1000 / 100
        let count = 0;

        intervalIdRef.current = setInterval(()=>{
            if(count >= 100) {
                clearInterval(intervalIdRef.current);
                intervalIdRef.current = null;

                if (props.trigger && props.callback) {
                    props.callback();
                }
            }
            else {
                count = count + increaseBy;
                setPercentage(count);
            }
        },intervalTime);
    }

    useEffect(()=>{
        if (props.trigger) {
            countTo100(props.timer,1);
        }
        else {
            clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
        }

        return () => {
            clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
        };
    },[props.trigger]);

    return  <Space>
                <Button style={{...defaultStyle, ...props.style}} disabled={props.disabled} onClick={props.onClick}>
                <div style={{
                    position: 'absolute',
                    top: '55%',
                    left: '10px',
                    transform: 'translateY(-50%)',
                }}>
                    <Progress
                    type="circle"
                    percent={percentage}
                    size={20}
                    showInfo={false}
                    strokeWidth={10}
                    />
                </div>
                {props.text}
                </Button>
            </Space>;
}

export default ProgressButton;