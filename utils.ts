/// <reference path="d/es6-shim.d.ts"/>

import {Optional} from "./types";

/** array 相關工具 */
export function first<T>(list: T[]): Optional<T> {
    return list.length == 0 ? Optional.empty() : Optional.of(list[0]);
}

export function last<T>(list: T[]): Optional<T> {
    return list.length == 0 ? Optional.empty() : Optional.of(list[list.length-1]);
}

export function zip<A,B>(list1: A[], list2: B[]) {
    let len = Math.min(list1.length, list2.length);
    let res = <[A, B][]>[];
    for (let i=0; i<len; i++) {
        res.push([list1[i], list2[i]]);
    }
    return res;
}

export function flatten<T>(listOfList: T[][]) {
    let res: T[] = [];
    listOfList.forEach(list => list.forEach(i => res.push(i)));
    return res;
}

export function range(begin: number, end: number) {
    /** 產生從 begin...end-1 的 number array */
    let res: number[] = [];
    for (let i = begin; i < end; i++) {
        res.push(i);
    }
    return res;
}

/** Set */
export function intersection<T>(s1: Set<T>, s2: Set<T>) {
    return new Set(Array.from(s1.values()).filter(i => s2.has(i)));
}

/** random */
export function getRandomInt(min: number, max: number) {
    /** 從 min 到 max 中隨機取一個整數。包含 min 但不包含 max */
    return Math.floor(Math.random() * (max - min)) + min;
}

export function randomChoice<T>(list: T[]): T {
    return list[getRandomInt(0, list.length)];
}

export function randomChoices<T>(list: T[], count: number): T[] {
    /** 不會更改 list。參考自 http://bost.ocks.org/mike/shuffle/ */
    if (count > list.length) {
        throw "count 太大";
    }
    let idxs: number[] = range(0, list.length);
    return range(0, count).map(x =>  {
        let i = getRandomInt(0, idxs.length);
        return list[idxs.splice(i, 1)[0]];
    });
}
