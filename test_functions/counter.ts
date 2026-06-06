let counter = 0;
export async function handler(event:any){
    counter++;

    return {
        message: "Hello from mini lambda",
        counter,
        event
    }
}