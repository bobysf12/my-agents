type ContextData = { [key: string]: any };

export class Context {
    private data: ContextData = {};

    get(key: string): any {
        return this.data[key];
    }

    set(key: string, value: any): void {
        this.data[key] = value;
    }

    append(key: string, value: any): void {
        if (!this.data[key]) this.data[key] = [];
        this.data[key].push(value);
    }
}
