import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { Spinner } from '@contentful/forma-36-react-components';
import Select from 'react-select';
import { init } from 'contentful-ui-extensions-sdk';
import '@contentful/forma-36-react-components/dist/styles.css';
import 'whatwg-fetch';
import './index.css';

const customStyles = {
  multiValueLabel: (provided, state) => ({
    ...provided,
    'padding-left': 10,
    background: '#e5ebed',
    color: '#536171',
    'font-size': '0.875rem',
    'line-height': '1.5rem',
    'font-family':
      '-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol'
  }),
  multiValueRemove: (provided, state) => ({
    ...provided,
    padding: 7,
    background: '#e5ebed'
  }),
  valueContainer: (provided, state) => ({
    ...provided,
    padding: 5
  })
};

export class App extends React.Component {
  static propTypes = {
    sdk: PropTypes.object.isRequired
  };

  detachExternalChangeHandler = null;

  constructor(props) {
    super(props);
    this.state = {
      value: props.sdk.field.getValue() || [],
      error: false,
      hasLoaded: false,
      branches: []
    };
  }

  componentDidMount() {
    this.props.sdk.window.startAutoResizer();
    console.log(this.props.sdk.parameters);
    // Handler for external field value changes (e.g. when multiple authors are working on the same entry).
    this.detachExternalChangeHandler = this.props.sdk.field.onValueChanged(this.onExternalChange);

    if (this.props.sdk.parameters.instance.apiUrl) {
      fetch(this.props.sdk.parameters.instance.apiUrl)
        .then(res => res.json())
        .then(
          branches => {
            let parsedBranches = branches.map(branch => {
              return { value: branch.key, label: branch.text };
            });
            this.setState({
              hasLoaded: true,
              branches: parsedBranches
            });
          },
          error => {
            this.setState({
              hasLoaded: true,
              error: 'Error: Could not fetch options from API'
            });
          }
        );
    } else {
      this.setState({
        error: 'Error: Missing or invalid API URL'
      });
    }
  }

  componentWillUnmount() {
    if (this.detachExternalChangeHandler) {
      this.detachExternalChangeHandler();
    }
  }

  onExternalChange = value => {
    this.setState({ value });
  };

  onChange = selection => {
    this.setState({ value: selection });
    this.props.sdk.field.setValue(selection);
  };

  render() {
    if (!this.state.hasLoaded) {
      return <Spinner />;
    } else if (this.state.error) {
      return <p>{this.state.error}</p>;
    }

    const placeholder = this.props.sdk.parameters.instance.placeholderText || 'Choose a value';
    const selectConfig = this.props.sdk.parameters.instance.selectConfig === 'multi' ? true : false;

    return (
      <Select
        styles={customStyles}
        defaultValue={this.state.value}
        name="branch"
        placeholder={placeholder}
        isMulti={selectConfig}
        options={this.state.branches}
        className="basic-multi-select"
        classNamePrefix="select"
        onChange={this.onChange}
      />
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
if (module.hot) {
  module.hot.accept();
}
