'use client';

import { CheckIcon, ChevronsUpDown } from 'lucide-react';

import * as React from 'react';
import timezones from 'timezones-list';
import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface TimezoneOption {
	value: string;
	label: string;
	searchText: string;
}

export default function TimezoneCombobox({
	value,
	setValue,
}: {
	value: string;
	setValue: (value: string) => void;
}) {
	// timezones.default contains the array of timezone objects
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const timezoneList = (timezones as any).default || timezones;

	// Debug: Log the structure to see what we're working with
	// console.log('Timezone data structure:', timezones);
	// console.log('Timezone list:', timezoneList);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const options: TimezoneOption[] = timezoneList.map((tz: any) => ({
		value: tz.tzCode,
		label: tz.label, // Use tz.label instead of tz.name
		searchText: `${tz.tzCode} ${tz.label} ${tz.utc}`.toLowerCase(),
	}));


	const [open, setOpen] = React.useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="reverse"
					role="combobox"
					aria-expanded={open}
					className="w-full bg-white justify-between"
				>
					{value
						? options.find(opt => opt.value === value)?.label || value
						: 'Select timezone...'}
					<ChevronsUpDown />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-(--radix-popover-trigger-width) border-0 p-0">
				<Command className="**:data-[slot=command-input-wrapper]:h-11">
					<CommandInput placeholder="Search timezones..." />
					<CommandList className="p-1">
						<CommandEmpty>No timezone.</CommandEmpty>
						<CommandGroup>
							{options.map(option => (
								<CommandItem
									key={option.value}
									value={option.searchText}
									onSelect={currentValue => {
										// Find the option that matches the search text
										const selectedOption = options.find(
											opt => opt.searchText === currentValue
										);
										if (selectedOption) {
											setValue(selectedOption.value);
										}
										setOpen(false);
									}}
								>
									<div className="flex flex-col">
										<span className="font-medium">{option.label}</span>
										<span className="text-xs text-muted-foreground">
											{option.value}
										</span>
									</div>
									<CheckIcon
										className={cn(
											'ml-auto',
											value === option.value ? 'opacity-100' : 'opacity-0'
										)}
									/>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
