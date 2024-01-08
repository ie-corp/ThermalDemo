interface IHistoryEntry{ 
    "historyType": string, 
    "time"?: number, 
    "materialMap"?: IKnownMaterial[] | null, 
    "distanceMap"?: number[] | null,
    "regionEditor":string | null, 
    "selectedIndex"?: number | null,
}
