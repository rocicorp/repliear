import React, { useState } from "react";
import { Description, Issue, Priority, Status } from "./issue";
import { nanoid } from "nanoid";

import PriorityMenu from "./priority-menu";
import StatusMenu from "./status-menu";
import { Cross2Icon } from "@radix-ui/react-icons";
import {
  Button,
  Dialog,
  Flex,
  IconButton,
  TextArea,
  TextField,
  Text,
  Heading,
} from "@radix-ui/themes";

interface Props {
  isOpen: boolean;
  onDismiss?: () => void;
  onCreateIssue: (
    i: Omit<Issue, "kanbanOrder">,
    description: Description
  ) => void;
}

export default function IssueModal({ onDismiss, onCreateIssue }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(Priority.NONE);
  const [status, setStatus] = useState(Status.BACKLOG);

  const handleSubmit = () => {
    if (title === "") {
      //   showWarning("Please enter a title before submiting", "Title required");
      return;
    }
    onCreateIssue(
      {
        id: nanoid(),
        title,
        priority,
        status,
        modified: new Date().getTime(),
        created: new Date().getTime(),
        creator: "Me",
      },
      description
    );
    if (onDismiss) onDismiss();
    resetModalState();
  };

  const resetModalState = () => {
    setTitle("");
    setDescription("");
    setPriority(Priority.NONE);
    setStatus(Status.BACKLOG);
  };

  const handleClickCloseBtn = () => {
    if (onDismiss) onDismiss();
  };

  return (
    <Dialog.Content style={{ maxWidth: 450 }}>
      <Flex height="9" justify="between" align="center">
        <StatusMenu onSelect={setStatus} status={status} />
        <Heading>New issue</Heading>
        <Dialog.Close>
          <IconButton color="gray" onClick={handleClickCloseBtn}>
            <Cross2Icon className="w-5 h-5 cursor-pointer" />
          </IconButton>
        </Dialog.Close>
      </Flex>
      <Text size="2" as="label">
        Title
      </Text>
      <TextField.Root className="mb-4 mt-2">
        <TextField.Input
          value={title}
          placeholder="New Issue Title"
          onChange={(e) => setTitle(e.target.value)}
        />
      </TextField.Root>
      <Text size="2" as="label">
        Description
      </Text>
      <TextArea
        className="mt-2"
        placeholder="New Issue Description"
        onChange={(e) => setDescription(e.target.value)}
        value={description}
      ></TextArea>
      <Flex justify="between">
        <PriorityMenu onSelect={setPriority} labelVisible priority={priority} />
        <Dialog.Close>
          <Button variant="surface" className="my-4" onClick={handleSubmit}>
            Add new issue
          </Button>
        </Dialog.Close>
      </Flex>
    </Dialog.Content>
  );
}
