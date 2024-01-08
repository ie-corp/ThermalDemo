interface ICamera{
    name:string,
    existingName:string,
    isOnline:boolean,
    isThermalCamera: boolean,
    canRenameCamera: boolean,
    canEditRotation: boolean,
    canEdit: boolean,
    canDeleteCamera: boolean,
    api: string|null,
    url:string|null,
    usbIndex: number|null,
    canEditMirror: boolean,
    isKnown: boolean,
    canEditMaterialLayer: boolean,
    canEditDistanceLayer: boolean,
    canAddPolygonSpot: boolean,
    canMoveSpots: boolean,
    canAddPointSpot: boolean,
    canDeleteSpots: boolean,
    canRenameSpots: boolean,
    canChangeSpotColor: boolean

}