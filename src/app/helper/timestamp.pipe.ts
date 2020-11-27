import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'timestamp',
})
export class TimestampPipe implements PipeTransform {
  transform(str: string): string {
    const date: Date = new Date(str);
    let hour: string | number = date.getHours();
    let minute: string | number = date.getMinutes();
    hour = hour < 10 ? '0' + hour : hour;
    minute = minute < 10 ? '0' + minute : minute;
    return hour + ':' + minute;
  }
}
