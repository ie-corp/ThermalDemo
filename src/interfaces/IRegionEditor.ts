interface IRegionEdtior{
   
    "imageRotation": number,
    "imageMirrorHorizontally": boolean,
    "maxNameLength": number,//same as RS
    "imageNativeWidth": number,
    "imageNativeHeight": number,
    "imageWidth": number,
    "imageHeight": number,
    "regions": IRegion[],
    "selectedRegionIndex": number
}