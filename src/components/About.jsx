import React, { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';

const About = () => {
    const [version, setVersion] = useState('');

     useEffect(() => {
        getVersion().then((version) => {
            setVersion(version);
        });
    }, []);

    return (
        <div style={{
            width:"80%",
            margin:"auto",
        }}>
            <p>App version {version}<br/>Built on 30.08.2024</p>
            <p>If you want to participate in discussion about how this app should look like or behave, feel free to join on GitHub: <a href="https://github.com/FaultierSP/civitaiapiclient">https://github.com/FaultierSP/civitaiapiclient</a></p>
        </div>
    );
};

export default About;