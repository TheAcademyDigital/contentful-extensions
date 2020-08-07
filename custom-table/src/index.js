import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import ReactDOMServer from 'react-dom/server';
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  Button,
  EditorToolbar,
  Icon
} from '@contentful/forma-36-react-components';
import { init } from 'contentful-ui-extensions-sdk';
import '@contentful/forma-36-react-components/dist/styles.css';
import './index.css';
import EditableLabel from './EditableLabel';
import ConfirmModal from './ConfirmModal';

export class App extends Component {
  static propTypes = {
    sdk: PropTypes.object.isRequired
  };

  detachExternalChangeHandler = null;

  constructor(props) {
    super(props);
    this.state = {
      data: [],
      isShown: false,
      delete: { type: '', index: '', message: '' },
      colCount: 0
    };
  }

  componentDidMount() {
    this.props.sdk.window.startAutoResizer();
    var data = this.props.sdk.field.getValue();
    if (
      data !== undefined &&
      data.jsonTable !== undefined &&
      data.jsonTable.tableData !== undefined
    ) {
      let colCount =
        data.jsonTable.tableData.length > 0 && data.jsonTable.tableData[0].length > 0
          ? data.jsonTable.tableData[0].length
          : 0;
      this.setState({
        data: data.jsonTable.tableData,
        colCount
      });
    }

    // Handler for external field value changes (e.g. when multiple authors are working on the same entry).
    // this.detachExternalChangeHandler = this.props.sdk.field.onValueChanged(this.onExternalChange);
  }

  componentWillUnmount() {
    // if (this.detachExternalChangeHandler) {
    //   this.detachExternalChangeHandler();
    // }
  }

  // onExternalChange = (value) => {
  //   this.setState({ value });
  // };

  addColumn = () => {
    let data = [...this.state.data];
    if (data.length > 0) {
      data.map((row, i) => {
        if (i === 0) {
          return row.push('');
        } else {
          return row.push('');
        }
      });
    } else {
      data.push(['']);
    }
    this.setState({
      data,
      colCount: this.state.colCount + 1
    });
    this.updateContentful();
  };

  deleteColumnClick = index => {
    this.setState({
      isShown: true,
      delete: {
        type: 'col',
        index,
        message: 'Are you sure you want to delete this column?'
      }
    });
  };

  deleteColumn = index => {
    var data = [...this.state.data];
    // console.log('data in delete col', data);
    if (index !== undefined) {
      this.setState(
        {
          data: [],
          colCount: this.state.colCount - 1
        },
        () => {
          data.map((row, i) => {
            row.splice(index, 1);
          });
          this.setState(
            {
              data
            },
            () => {
              this.updateContentful();
            }
          );
        }
      );
    }
  };

  addRow = () => {
    let data = [...this.state.data];
    let length = data[0].length;
    let array = Array.apply(null, Array(length)).map(function() {
      return '';
    });
    data.push(array);
    this.setState({
      data
    });
    this.updateContentful();
  };

  deleteRowClick = index => {
    this.setState({
      isShown: true,
      delete: {
        type: 'row',
        index,
        message: 'Are you sure you want to delete this row?'
      }
    });
  };

  deleteRow = index => {
    var data = [...this.state.data];
    if (index !== undefined) {
      this.setState(
        {
          data: []
        },
        () => {
          data.splice(index, 1);
          console.log('row data', data);
          this.setState(
            {
              data
            },
            () => {
              this.updateContentful();
            }
          );
        }
      );
    }
  };

  modalClose = bool => {
    this.setState({ isShown: !this.state.isShown });
    if (bool) {
      if (
        this.state.delete.type !== undefined &&
        this.state.delete.type === 'col' &&
        this.state.delete.index !== undefined
      ) {
        this.deleteColumn(this.state.delete.index);
      } else if (
        this.state.delete.type !== undefined &&
        this.state.delete.type === 'row' &&
        this.state.delete.index !== undefined
      ) {
        this.deleteRow(this.state.delete.index);
      }
    }
    this.setState({
      delete: { type: '', index: '', message: '' }
    });
  };

  saveCell = (val, row, col) => {
    // console.log('save cell', val);
    let data = [...this.state.data];
    if (val !== undefined && row !== undefined && col !== undefined) {
      this.setState(
        {
          data: []
        },
        () => {
          data[row][col] = val;
        }
      );
      this.setState(
        {
          data
        },
        () => {
          this.updateContentful();
        }
      );
    }
  };

  generateTableMarkup = () => {
    if (this.state.data !== undefined && this.state.data.length > 0) {
      let tableData = this.state.data.map((row, i) => {
        if (i === 0) {
          return (
            <tr key={`tr-${i}`}>
              {this.state.data[i].map((val, i) => {
                return <th key={`th-${i}`} dangerouslySetInnerHTML={{ __html: val }} />;
              })}
            </tr>
          );
        } else {
          return (
            <tr key={`tr-${i}`}>
              {this.state.data[i].map((val, i) => {
                return <td key={`td-${i}`} dangerouslySetInnerHTML={{ __html: val }} />;
              })}
            </tr>
          );
        }
      });
      return ReactDOMServer.renderToString(<table>{tableData}</table>);
    }
  };

  updateContentful = () => {
    // console.log('updating contentful', this.state.data);
    // console.log('tableMarkup', this.generateTableMarkup());
    var obj = {
      jsonTable: {
        tableData: this.state.data
      },
      htmlTable: {
        tableData: this.generateTableMarkup()
      }
    };
    this.props.sdk.field.setValue(obj);
  };

  render() {
    let { allowStyling, allowLinks, allowLists } = this.props.sdk.parameters.instance;
    let colMax = this.props.sdk.parameters.instance.columnLimit || 10;
    // console.log(this.state.colCount, colMax);
    if (this.state.data.length > 0) {
      // console.log('data in render', this.state.data);
      var tableBody = this.state.data.map((row, i) => {
        if (i === 0) {
          return (
            <TableHead key={`head-${i}`}>
              <TableRow>
                {row.map((val, x) => {
                  return (
                    <>
                      <EditableLabel
                        type="col"
                        deleteColumn={this.deleteColumnClick}
                        saveCell={this.saveCell}
                        key={`data-${i}-${x}`}
                        value={val}
                        row={i}
                        col={x}
                        allowStyling={allowStyling}
                        allowLinks={allowLinks}
                        allowLists={allowLists}
                      />
                    </>
                  );
                })}
              </TableRow>
            </TableHead>
          );
        } else {
          return (
            <TableBody key={`body-${i}`}>
              <TableRow>
                {row.map((val, x) => {
                  return (
                    <EditableLabel
                      type="row"
                      deleteRow={this.deleteRowClick}
                      saveCell={this.saveCell}
                      key={`data-${i}-${x}`}
                      value={val}
                      row={i}
                      col={x}
                      allowStyling={allowStyling}
                      allowLinks={allowLinks}
                      allowLists={allowLists}
                    />
                  );
                })}
              </TableRow>
            </TableBody>
          );
        }
      });
    }
    return (
      <>
        <EditorToolbar style={{ marginTop: '10px', marginBottom: '10px' }}>
          {this.state.colCount < colMax ? (
            <Button size="small" buttonType="muted" onClick={this.addColumn}>
              <Icon icon="Plus" style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Add Column
            </Button>
          ) : (
            <Button disabled={true} size="small" buttonType="muted" onClick={this.addColumn}>
              <Icon icon="Plus" style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Add Column
            </Button>
          )}
          {this.state.colCount > 0 ? (
            <Button
              size="small"
              buttonType="muted"
              onClick={this.addRow}
              style={{ marginLeft: '8px' }}>
              <Icon icon="Plus" style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Add Row
            </Button>
          ) : (
            <Button
              disabled={true}
              size="small"
              buttonType="muted"
              onClick={this.addRow}
              style={{ marginLeft: '8px' }}>
              <Icon icon="Plus" style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Add Row
            </Button>
          )}
        </EditorToolbar>

        <Table>{tableBody}</Table>
        <ConfirmModal
          isShown={this.state.isShown}
          onClose={this.modalClose}
          content={this.state.delete.message}
        />
      </>
    );
  }
}

init(sdk => {
  ReactDOM.render(<App sdk={sdk} />, document.getElementById('root'));
});

/**
 * By default, iframe of the extension is fully reloaded on every save of a source file.
 * If you want to use HMR (hot module reload) instead of full reload, uncomment the following lines
 */
// if (module.hot) {
//   module.hot.accept();
// }
