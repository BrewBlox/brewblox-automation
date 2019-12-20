export interface DbStored {
    _id: string;
    _rev?: string;
}

export interface AutomationTask extends DbStored {
    ref: string;
    title: string;
    source: string;
    message: string;
    status: 'Created' | 'Started' | 'Done' | 'Unknown';
}
