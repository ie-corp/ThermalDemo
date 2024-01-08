interface IMetaHistoryEntry{
    historyType:string,
    time:number,
    materialMap: (IKnownMaterial|null)[] | null,
    distanceMap: (number|null)[] | null
}