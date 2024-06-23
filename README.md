# A client for the Civitai API
![Screenshot](screenshots/1-min.png)
A basic API client for viewing and downloading images in batches.
The app puts all the downloaded images in your systems "Downloads" folder.
## Building the app
[Here](https://tauri.app/v1/guides/getting-started/prerequisites) is the current doc on how to build a Tauri app. I've had some problems with the ```libayatana-appindicator3-dev``` packet on Debian, but coult install it from backports. Your npm installation shout also include the Tauri CLI tools, they can be installed by running ```npm install @tauri-apps/cli```

Then you can simply build it by
~~~
npm run tauri build
~~~
## Credits
### Civitai API
[API Reference](https://github.com/civitai/civitai/wiki/REST-API-Reference)
### Tauri
This project uses [Tauri](https://tauri.app/) to create a cross-platform application.
### ReactJS
This project uses [React](https://reactjs.org/) to create the user interface.
