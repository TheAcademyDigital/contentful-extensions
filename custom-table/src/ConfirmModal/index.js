import React from 'react';
import { Modal, Button, Icon } from '@contentful/forma-36-react-components';

const ConfirmModal = props => {
  return (
    <Modal
      title=" "
      position="top"
      size="small"
      topOffset="50px"
      isShown={props.isShown}
      onClose={props.onClose.bind(this, false)}>
      <Modal.Content>{props.content}</Modal.Content>
      <Modal.Controls>
        <Button onClick={props.onClose.bind(this, true)} buttonType="positive">
          Yes
        </Button>
        <Button onClick={props.onClose.bind(this, false)} buttonType="muted">
          No
        </Button>
      </Modal.Controls>
    </Modal>
  );
};

export default ConfirmModal;
