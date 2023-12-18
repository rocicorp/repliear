import CancelIcon from '../assets/icons/cancel.svg?react';
import BacklogIcon from '../assets/icons/circle-dot.svg?react';
import TodoIcon from '../assets/icons/circle.svg?react';
import DoneIcon from '../assets/icons/done.svg?react';
import InProgressIcon from '../assets/icons/half-circle.svg?react';
import classNames from 'classnames';
import {Status} from 'shared';

interface Props {
  status: Status;
  className?: string;
}

const getStatusIcon = (issueStatus: Status, className?: string) => {
  const classes = classNames('w-3.8 h-3.8 rounded', className);

  switch (issueStatus) {
    case 'BACKLOG':
      return <BacklogIcon className={classes} />;
    case 'TODO':
      return <TodoIcon className={classes} />;
    case 'IN_PROGRESS':
      return <InProgressIcon className={classes} />;
    case 'DONE':
      return <DoneIcon className={classes} />;
    case 'CANCELED':
      return <CancelIcon className={classes} />;
    default:
      return <BacklogIcon className={classes} />;
  }
};

export default function StatusIcon({status, className}: Props) {
  return getStatusIcon(status, className);
}
