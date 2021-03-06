import Component from "@ember/component";
import { observes, default as discourseComputed } from "discourse-common/utils/decorators";
import { scheduleOnce, later } from "@ember/runloop";
import {
  compileEvent,
  setupEventForm,
  timezoneLabel,
  getTimezone,
  formTimeFormat,
  nextInterval
} from '../lib/date-utilities';

export default Component.extend({
  classNames: 'event-form',
  endEnabled: false,
  allDay: false,
  showTimezone: false,
  
  didInsertElement() {    
    const props = setupEventForm(this.event);
    this.setProperties(props);
    this.setupTimePicker('start');
    this.setupTimePicker('end');
  },
  
  @discourseComputed('startDate', 'startTime', 'endDate', 'endTime', 'endEnabled', 'allDay')
  endValid(startDate, startTime, endDate, endTime, endEnabled, allDay) {
    let start = allDay ? moment(startDate, "YYYY-MM-DD") : moment(startDate+"T"+startTime, "YYYY-MM-DDTHH:mm");
    let end = allDay ? moment(endDate, "YYYY-MM-DD") : moment(endDate+"T"+endTime, "YYYY-MM-DDTHH:mm");

    return !endEnabled || end.isSameOrAfter(start);
  },

  @observes('startDate', 'startTime', 'endDate', 'endTime', 'endEnabled', 'allDay', 'timezone', 'rsvpEnabled', 'goingMax', 'usersGoing')
  eventUpdated(){
    const valid = this.endValid;
    const event = compileEvent({
      startDate: this.startDate,
      startTime: this.startTime,
      endDate: this.endDate,
      endTime: this.endTime,
      endEnabled: this.endEnabled,
      allDay: this.allDay,
      timezone: this.timezone,
      rsvpEnabled: this.rsvpEnabled,
      goingMax: this.goingMax,
      usersGoing: this.usersGoing
    });
    
    this.updateEvent(event, valid);
  },

  setupTimePicker(type) {    
    const time = this.get(`${type}Time`);
    later(this, () => {
      scheduleOnce('afterRender', this, () => {
        const $timePicker = $(`#${type}-time-picker`);
        $timePicker.timepicker({ timeFormat: 'H:i' });
        $timePicker.timepicker('setTime', time);
        $timePicker.change(() => {
          this.set(`${type}Time`, $timePicker.val());
        });
      })
    });
  },

  @discourseComputed()
  timezones() {
    const eventTimezones = this.get('eventTimezones') || this.site.event_timezones; 
    return eventTimezones.map((tz) => {
      return {
        value: tz.value,
        name: timezoneLabel(tz.value)
      }
    });
  },
  
  @discourseComputed('endEnabled')
  endClass(endEnabled) {
    return endEnabled ? '' : 'disabled';
  },
  
  actions: {
    toggleEndEnabled(value) {
      this.set('endEnabled', value);
      
      if (value) {
        if (!this.endDate) {
          this.set('endDate', this.startDate);
        }
        
        if (!this.allDay) {
          if (!this.endTime) {
            this.set('endTime', this.startTime);
          }
          
          this.setupTimePicker('end');
        }
      }
    },
    
    toggleAllDay(value) {
      this.set('allDay', value);
      
      if (!value) {
        const start = nextInterval();
        
        this.set('startTime', start.format(formTimeFormat));
        this.setupTimePicker('start');

        if (this.endEnabled) {
          const end = moment(start).add(1, 'hours');
                    
          this.set('endTime', end.format(formTimeFormat));
          this.setupTimePicker('end');
        }
      }
    }
  }
});
