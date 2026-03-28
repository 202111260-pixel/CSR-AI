import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import './Calendar.css';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      className={`spending-calendar ${className || ''}`}
      {...props}
    />
  );
}

export { Calendar };
