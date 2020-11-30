import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'keyvaluePipe',
})
export class KeyvaluePipe implements PipeTransform {
  transform<T>(data: {[key: string]: T}): {key: string; value: T}[] {
    if (data == null) return [];
    return Object.keys(data).map(key => {
      return {key: key, value: data[key]};
    });
  }
}
