import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";

import { Tabs, message } from "antd";

import Creators from "./components/Creators";
import CreatorsImagesDownloader from "./components/CreatorsImagesDownloader";
import SettingsForm from "./components/SettingsForm";
import Images from "./components/Images";
import EmptyPage from "./components/EmptyPage";

function App() {
  //Variables
  const [globalSettings,setGlobalSettings]=useState();
  const settingsFormRef=useRef();
  const [menuTabsItems,setMenuTabsItems]=useState([]);
  const [messageApi,contextHolder]=message.useMessage();

  //UI
  function showSuccessMessage(messageText) {
    messageApi.open({
      type:"success",
      content:messageText,
    });
  }

  function showErrorMessage(messageText) {
    messageApi.open({
      type:"error",
      content:messageText,
    });
  }

  function showWarningMessage(messageText) {
    messageApi.open({
      type:"warning",
      content:messageText,
    });
  }

  //Logic
  const loadGlobalSettings = () => {
    invoke("get_current_config")
      .then((settingsData)=>{
        setGlobalSettings(JSON.parse(settingsData));
      })
      .catch((error) =>  {
        //console.log("Couldn't load configuration: ", error);
        showErrorMessage("Couldn't load configuration: " + error);
      });
  }

  const loadMenuTabs = () => {
    setMenuTabsItems([
      {
        label:'Images',
        key:'images',
        children:(<Images 
          globalSettings={globalSettings}
          showSuccessMessage={showSuccessMessage}
          showErrorMessage={showErrorMessage}
          showWarningMessage={showWarningMessage}
        />)
      },
      {
        label:"Download all creator's images",
        key:'download_all',
        children:(<CreatorsImagesDownloader globalSettings={globalSettings} showSuccessMessage={showSuccessMessage} showErrorMessage={showErrorMessage}/>),
      },
      {
        label:'Creators of models',
        key:'creator',
        children:(<Creators globalSettings={globalSettings} showErrorMessage={showErrorMessage}/>)
      },
      {
        label:'Models',
        key:'models',
        children:(<EmptyPage/>)
      },
      {
        label:'Settings',
        key:'settings',
        children:(<SettingsForm ref={settingsFormRef} initialValues={globalSettings} sendDataToParent={sendUpdatedSettingsToBackend} />)
      }
    ]);
  }

  const sendUpdatedSettingsToBackend = (data) => {
    const configJson=JSON.stringify(data);
    
    invoke("save_config", {configJson} )
      .then(showSuccessMessage("Configuration saved."))
      .catch((error) => {
        //console.error("Failed to save configuration: ", error);
        showErrorMessage("Failed to save configuration: " + error);
      });
  }

  useEffect(()=>{
    loadGlobalSettings();
  },[]);


  useEffect(() => {
    if(typeof(globalSettings)!="undefined") {
      //console.log(globalSettings);
      loadMenuTabs();
    }
  },[globalSettings]);

  return (
    <>
    {contextHolder}
    <Tabs
      tabPosition="left"
      items={menuTabsItems}
      style={{
        backgroundColor:'#f6f6f6',
        height:'97vh',
        borderRadius:12,
        padding:12
      }}    
    />
    </>);
}

export default App;
