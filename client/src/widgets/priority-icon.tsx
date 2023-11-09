/* eslint-disable @typescript-eslint/naming-convention */
import SignalUrgentIcon from '../assets/icons/claim.svg?react';
import SignalNoPriorityIcon from '../assets/icons/dots.svg?react';
import SignalMediumIcon from '../assets/icons/signal-medium.svg?react';
import SignalStrongIcon from '../assets/icons/signal-strong.svg?react';
import SignalWeakIcon from '../assets/icons/signal-weak.svg?react';
import classNames from 'classnames';
import {Priority} from 'shared';

interface Props {
  priority: Priority;
  className?: string;
}

const ICONS = {
  HIGH: SignalStrongIcon,
  MEDIUM: SignalMediumIcon,
  LOW: SignalWeakIcon,
  URGENT: SignalUrgentIcon,
  NONE: SignalNoPriorityIcon,
};

export default function PriorityIcon({priority, className}: Props) {
  const classes = classNames('w-3.5 h-3.5 rounded', className);

  const Icon = ICONS[priority];

  return <Icon className={classes} />;
}
