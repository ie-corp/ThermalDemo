interface IRetentionField{

    Index:number,
    FormID:string,
    DisplayName:string,
    Description:string,
    FieldType:string,
    Value:string,
    Values:string[]|null,
    Required:boolean,
    MinimumLength:number,
    MaximumLength:number,
}