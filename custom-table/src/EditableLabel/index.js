import React, { Component } from 'react';
import { TableCell, Icon, Button } from '@contentful/forma-36-react-components';
import RichTextEditor from 'react-rte';
import './index.css';

class EditableLabel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      text:
        RichTextEditor.createValueFromString(this.props.value, 'html') ||
        RichTextEditor.createEmptyValue(),
      html: this.props.value,
      editing: false
    };
  }

  save = (val, row, col) => {
    this.setState({
      text: val,
      editing: false
    });
    this.props.saveCell(val.toString('html'), row, col);
  };

  onChange = val => {
    this.setState({ text: val, html: val.toString('html') });
  };

  render() {
    let {
      type,
      deleteColumn,
      deleteRow,
      row,
      col,
      allowStyling,
      allowLinks,
      allowLists
    } = this.props;

    let display = [];
    if (allowStyling) {
      display.push('INLINE_STYLE_BUTTONS');
    }
    if (allowLinks) {
      display.push('LINK_BUTTONS');
    }
    if (allowLists) {
      display.push('BLOCK_TYPE_BUTTONS');
    }

    const toolbarConfig = {
      // Optionally specify the groups to display (displayed in the order listed).
      display,
      INLINE_STYLE_BUTTONS: [
        { label: 'Bold', style: 'BOLD' },
        { label: 'Italic', style: 'ITALIC' },
        { label: 'Underline', style: 'UNDERLINE' }
      ],
      BLOCK_TYPE_BUTTONS: [
        { label: 'UL', style: 'unordered-list-item' },
        { label: 'OL', style: 'ordered-list-item' }
      ]
    };

    return this.state.editing ? (
      <>
        <RichTextEditor
          className="rich-text"
          value={this.state.text}
          onChange={this.onChange}
          toolbarConfig={toolbarConfig}
          autoFocus={true}
        />
        <Button className="button" onClick={this.save.bind(this, this.state.text, row, col)}>
          Save
        </Button>
      </>
    ) : (
      <TableCell className="table-cell">
        <div className="data-cell">
          {type !== undefined && type === 'col' ? (
            <div className="icon-ctn">
              <Icon
                className="icon-hover"
                icon="Delete"
                size="small"
                onClick={deleteColumn.bind(this, col)}
              />
            </div>
          ) : type !== undefined && type === 'row' && col === 0 ? (
            <div className="icon-ctn">
              <Icon
                className="icon-hover"
                icon="Close"
                size="small"
                onClick={deleteRow.bind(this, row)}
              />
            </div>
          ) : (
            ''
          )}
          {this.state.html !== '' && this.state.html !== '<p><br></p>' ? (
            <div
              dangerouslySetInnerHTML={{ __html: this.state.html }}
              className="content-cell"
              onClick={() => {
                this.setState({
                  editing: true
                });
              }}></div>
          ) : (
            <div
              style={{ color: 'lightgrey' }}
              className="content-cell"
              onClick={() => {
                this.setState({
                  editing: true
                });
              }}>
              Click to edit
            </div>
          )}
        </div>
      </TableCell>
    );
  }
}

export default EditableLabel;
