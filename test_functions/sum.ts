export async function handler(event:any) {
  const {a,b} = event;
  return {
    result : a+b
  }
}