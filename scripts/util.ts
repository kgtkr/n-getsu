export function getRandomArray<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export const strsplit: (str: string, pattern?: string | RegExp, limit?: number)=>string[] = require('strsplit');
