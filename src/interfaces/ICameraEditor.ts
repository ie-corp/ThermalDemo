interface ICameraEditor{
    "selectedCameraIndex": number,
    "isViewingCelsius": boolean,
    "showHotspotNumbers": boolean,
    "isEditing": boolean,
    "isWatchingLive":boolean,
    "minZoomLevel":number,
    "maxZoomLevel":number,
    "defaultZoomLevel":number,
    "cameras": ICamera[],
    "tags": ITag[],
};