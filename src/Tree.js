import React from 'react';
import {ScrollView, View, Text, TouchableWithoutFeedback, Dimensions,PixelRatio,DeviceEventEmitter } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MyUtils from './MyUtils'

const ScreenHeight = Dimensions.get('window').height;
class Tree extends React.Component {
    static upSelectedKeys = (data, flag) => {
      DeviceEventEmitter.emit('upSelectedKeys', data, flag);
    }

    constructor(props) {
        super(props);
        this.state = {
            expanded: {},       // 所有节点 key:value 键值对 value为true时展开，否则收起
            selected: {},       // 所有节点 key:value 键值对 value为true时选中，否则不选
            expandedKeys: [],   // 所有展开节点 key 数组
            selectedKeys: [],   // 所有选中节点 key 数组
            selectedNodes: [],  // 所有选中节点数组
        }
    }

    componentWillMount() {
        DeviceEventEmitter.addListener('upSelectedKeys', (v, f) => this.upSelectedKeys(v, f));
        let {checkable, checkStrictly, expandedKeys, selectedKeys, defaultSelectedKeys, defaultExpandedKeys,
             defaultExpandAll, defaultExpandRoot, treeData} = this.props;
        let tempExpandedKeys = [];
        let expanded = {};
        let selected = {};
        
        // 默认展开根节点
        if (defaultExpandRoot) {
            if(treeData && treeData.length === 1) {
                tempExpandedKeys = [treeData[0].id];
                expanded[treeData[0].id] = true;
            }
        }

        // 默认展开所有节点
        if (defaultExpandAll) {
            tempExpandedKeys = [];
            MyUtils.traverseTree(treeData, (node) => {
                tempExpandedKeys.push(node.id);
                expanded[node.id] = true;
            });
        }

        // 受控或默认展开和选择的节点
        if (expandedKeys || defaultExpandedKeys) {
            expanded = MyUtils.arrayToObj(expandedKeys || defaultExpandedKeys);
        }

        if (selectedKeys || defaultSelectedKeys) {
            selected = MyUtils.arrayToObj(selectedKeys || defaultSelectedKeys);
        }
        let selectedNodes = [];
        MyUtils.traverseTree(treeData, (node, parent) => {
            node.parentNode = parent;
            if (selectedKeys && selectedKeys.indexOf(node.id) !== -1) {
                selectedNodes.push(node);
                if (checkable && !checkStrictly) {
                    MyUtils.parentSelect(parent, selected, [], []);
                }
            }
        }, null);

        this.setState({
            expanded: expanded,
            selected: selected,
            expandedKeys: expandedKeys || defaultExpandedKeys || tempExpandedKeys,
            selectedKeys: selectedKeys || defaultSelectedKeys || [],
            selectedNodes: selectedNodes || []
        })
    }

    upSelectedKeys = (id, flag = true) => {
      if(!this.props.checkable)return;
      let node={id};
      let {selectedKeys, selected, expanded, selectedNodes} = this.state;
        const {onSelect, multiple, checkable, checkStrictly} = this.props;
        let isSelected = selected[node.id];
        selected[node.id] = !isSelected;
        // 父子节点关联关系
        let selectNode = (node, isSelect) => {
            if (!!!node || !!!node.nodes || node.nodes.length === 0) {
                return;
            }

            /*if (!expanded[node.id]) {
                return;
            }*/

            let childNum = 0;
            let childSelectAllNum = 0;
            // 过滤掉禁用节点
            let children = node.nodes.filter(item => !item.disabled);
            // 计算子节点选中数量
            let childrenKeys = children.map(item => {
                if (selected[item.id] === true) {
                    childNum++;
                    childSelectAllNum++;
                }
                if (selected[item.id] === null) {
                    childNum++;
                }
                return item.id;
            });
            /*console.warn(childrenKeys)
            console.warn(selectedKeys)
            console.warn(children)*/
            children.map(item => {
                selected[item.id] = isSelect;

                // 如果子节点有子节点并处于展开状态，则递归选中
                /*if (expanded[item.id]) {
                    selectNode(item, isSelect);
                } */
                selectNode(item, isSelect);
            });
            if (childSelectAllNum === children.length && !isSelect) {  // 当全部选中时且选择的根节点为选中状态
                selectedKeys = selectedKeys.filter(id => -1 === childrenKeys.indexOf(id));
                selectedNodes = selectedNodes.filter(item => -1 === childrenKeys.indexOf(item.id));
            } else if (childNum === 0) {  // 当全没选中时

                selectedKeys = selectedKeys.concat(childrenKeys);
                selectedNodes = selectedNodes.concat(children);
            } else {  // 当部分选中时

                if(isSelect){
                    childrenKeys.map(item => {
                        if (selectedKeys.indexOf(item) === -1) {
                            selectedKeys.push(item);
                        }
                    });
                    children.map(item => {
                        if (selectedKeys.indexOf(item) === -1) {
                            selectedNodes.push(item);
                        }
                    });
                }else{
                    selectedKeys = selectedKeys.filter(id => -1 === childrenKeys.indexOf(id));
                    selectedNodes = selectedNodes.filter(item => -1 === childrenKeys.indexOf(item.id));
                }
            }
        }
        
        // 多选父子节点不建立关联关系
        let multipleSelect = () => {
            if (isSelected) {
                selectedKeys = selectedKeys.filter(id => id !== node.id);
                selectedNodes = selectedNodes.filter(item => item.id !== node.id);
            } else {
                selectedKeys.push(node.id);
                selectedNodes.push(node);
            }
        }
        // 单选
        let singleSelect = () => {
            selectedKeys = [node.id];
            selected = {};
            selected[node.id] = true;
            selectedNodes = [node];
        }
        /**
         * 1. 如果定义checkable则建立父子节点关联关系
         * 2. 如果定义checkStrictly则取消父子节点关联关系
         * 3. 如果定义multiple则多选
         */ 

        if (checkable) {
            if (checkStrictly) {
                if (multiple) {
                    multipleSelect();
                } else {
                    singleSelect();
                }
            } else {
                // 先递归处理子节点
                selectNode(node, !isSelected);

                // 然后回溯到根节点
                MyUtils.parentSelect(node.parentNode, selected, selectedKeys, selectedNodes);
                // 最后处理当前节点
                if (!isSelected) {
                    selectedKeys.push(node.id);
                    selectedNodes.push(node);
                } else {
                    selectedKeys = selectedKeys.filter(id => id !== node.id);
                    selectedNodes = selectedNodes.filter(item => item.id !== node.id);
                }
            }
        } else {
            if (multiple) {
                multipleSelect();
            } else {
                singleSelect();
            }
        }

        this.setState({
            selectedKeys: selectedKeys,
            selected: selected,
            selectedNodes: selectedNodes
        })
        
        // if(flag) {
          onSelect && onSelect(selectedKeys, {
            selected: !isSelected, 
            selectedNodes: selectedNodes, 
            node: node
          });
        // }
    }
    
    /**
     * expandedKeys （受控）展开指定的树节点
     * selectedKeys （受控）选中指定的树节点
     * @param {{expandedKeys, selectedKeys}} nextProps 
     */
    componentWillReceiveProps(nextProps) {
        let {checkable, checkStrictly, treeData, expandedKeys, selectedKeys} = nextProps;
        let selected = {};
        let expanded = {};
        
        if (this.props.selectedKeys !== selectedKeys) {
            selected = MyUtils.arrayToObj(selectedKeys);
            let selectedNodes = [];
            MyUtils.traverseTree(treeData, (node, parent) => {
                node.parentNode = parent;
                if (selectedKeys.indexOf(node.id) !== -1) {
                    selectedNodes.push(node);
                    if (checkable && !checkStrictly) {
                        MyUtils.parentSelect(parent, selected, [], []);
                    }
                }
            }, null);

            this.setState({
                selected: selected,
                selectedKeys: selectedKeys,
                selectedNodes: selectedNodes
            })
        }
        if (this.props.expandedKey !== expandedKeys) {
            expanded = MyUtils.arrayToObj(expandedKeys);    
            this.setState({
                expanded: expanded,
                expandedKeys: expandedKeys,
            })
        }
    }

    componentWillUnmount() {
      DeviceEventEmitter.removeAllListeners('upSelectedKeys');
    }
    
    /**
     * 选择节点事件触发
     * @param {TreeNode} node 
     */
    onSelect(node) {
        let {selectedKeys, selected, expanded, selectedNodes} = this.state;
        const {onSelect, multiple, checkable, checkStrictly} = this.props;
        let isSelected = selected[node.id];
        selected[node.id] = !isSelected;
        // 父子节点关联关系
        let selectNode = (node, isSelect) => {
            if (!!!node || !!!node.nodes || node.nodes.length === 0) {
                return;
            }

            /*if (!expanded[node.id]) {
                return;
            }*/

            let childNum = 0;
            let childSelectAllNum = 0;
            // 过滤掉禁用节点
            let children = node.nodes.filter(item => !item.disabled);
            // 计算子节点选中数量
            let childrenKeys = children.map(item => {
                if (selected[item.id] === true) {
                    childNum++;
                    childSelectAllNum++;
                }
                if (selected[item.id] === null) {
                    childNum++;
                }
                return item.id;
            });
            /*console.warn(childrenKeys)
            console.warn(selectedKeys)
            console.warn(children)*/
            children.map(item => {
                selected[item.id] = isSelect;

                // 如果子节点有子节点并处于展开状态，则递归选中
                /*if (expanded[item.id]) {
                    selectNode(item, isSelect);
                } */
                selectNode(item, isSelect);
            });
            if (childSelectAllNum === children.length && !isSelect) {  // 当全部选中时且选择的根节点为选中状态
                selectedKeys = selectedKeys.filter(id => -1 === childrenKeys.indexOf(id));
                selectedNodes = selectedNodes.filter(item => -1 === childrenKeys.indexOf(item.id));
            } else if (childNum === 0) {  // 当全没选中时

                selectedKeys = selectedKeys.concat(childrenKeys);
                selectedNodes = selectedNodes.concat(children);
            } else {  // 当部分选中时

                if(isSelect){
                    childrenKeys.map(item => {
                        if (selectedKeys.indexOf(item) === -1) {
                            selectedKeys.push(item);
                        }
                    });
                    children.map(item => {
                        if (selectedKeys.indexOf(item) === -1) {
                            selectedNodes.push(item);
                        }
                    });
                }else{
                    selectedKeys = selectedKeys.filter(id => -1 === childrenKeys.indexOf(id));
                    selectedNodes = selectedNodes.filter(item => -1 === childrenKeys.indexOf(item.id));
                }
            }
        }
        
        // 多选父子节点不建立关联关系
        let multipleSelect = () => {
            if (isSelected) {
                selectedKeys = selectedKeys.filter(id => id !== node.id);
                selectedNodes = selectedNodes.filter(item => item.id !== node.id);
            } else {
                selectedKeys.push(node.id);
                selectedNodes.push(node);
            }
        }
        // 单选
        let singleSelect = () => {
            selectedKeys = [node.id];
            selected = {};
            selected[node.id] = true;
            selectedNodes = [node];
        }
        /**
         * 1. 如果定义checkable则建立父子节点关联关系
         * 2. 如果定义checkStrictly则取消父子节点关联关系
         * 3. 如果定义multiple则多选
         */ 

        if (checkable) {
            if (checkStrictly) {
                if (multiple) {
                    multipleSelect();
                } else {
                    singleSelect();
                }
            } else {
                // 先递归处理子节点
                selectNode(node, !isSelected);

                // 然后回溯到根节点
                MyUtils.parentSelect(node.parentNode, selected, selectedKeys, selectedNodes);
                // 最后处理当前节点
                if (!isSelected) {
                    selectedKeys.push(node.id);
                    selectedNodes.push(node);
                } else {
                    selectedKeys = selectedKeys.filter(id => id !== node.id);
                    selectedNodes = selectedNodes.filter(item => item.id !== node.id);
                }
            }
        } else {
            if (multiple) {
                multipleSelect();
            } else {
                singleSelect();
            }
        }

        this.setState({
            selectedKeys: selectedKeys,
            selected: selected,
            selectedNodes: selectedNodes
        })
        
        onSelect && onSelect(selectedKeys, {
            selected: !isSelected, 
            selectedNodes: selectedNodes, 
            node: node
        }); 
    }
    
    /**
     * 点击展开或收起图标时触发
     * @param {TreeNode} node 
     */
    onExpand(node) {
        const {checkable, checkStrictly} = this.props;
        let {expandedKeys, expanded, selected, selectedKeys, selectedNodes} = this.state;
        const {id, children} = node;
        const {onExpand} = this.props;
        let isExpanded = expanded[id];
        expanded[id] = !isExpanded;
        
        if (isExpanded) {
            expandedKeys = expandedKeys.filter(expandedKey => expandedKey !== id);
        } else {
            expandedKeys.push(id);
        }

        if (selected[id] === true && checkable && !checkStrictly) {
            // 过滤掉禁用节点
            let children = node.nodes.filter(item => !!!item.disabled);
            children.map(item => {
                if (isExpanded) {
                    // console.warn(22222222222)
                    /*selected[item.id] = false;
                    selectedKeys = selectedKeys.filter(selectedKey => selectedKey !== item.id);
                    selectedNodes = selectedNodes.filter(selectedNode => selectedNode.id !== item.id);
                    console.warn(selectedKeys)*/
                    // console.warn(selectedNodes)
                } else {
                    /*console.warn(11111111111)
                    selected[item.id] = true;
                    selectedKeys.push(item.id);
                    selectedNodes.push(item);*/
                }
            });
        }
        
        this.setState({
            expandedKeys: expandedKeys,
            expanded: expanded,
            selectedKeys: selectedKeys,
            selected: selected,
            selectedNodes: selectedNodes
        })
        onExpand && onExpand(expandedKeys, {
            expanded: !isExpanded, 
            node: node
        }); 
    }
    
    /**
     * 渲染树节点图标和文字
     * @param {TreeNode} node 
     */
    renderItem(node) {
        const {checkable, checkStrictly,nodeStyle} = this.props;
        let {expanded, selected} = this.state;
        let {expandedKeys, selectedKeys, showLine, iconSize, expandIconSize} = this.props;
        const {id, nodes, icon, text, disabled, userPicture, gender} = node;

        iconSize = iconSize || 20;
        expandIconSize = expandIconSize || 20;
        let expandIconColor = '#333'
        const hasChildren = nodes && nodes.length > 0;
        let expandIcon = expanded[id] ? 'minus-square-o' : 'plus-square-o';
        
        if (showLine) {
            expandIconColor = '#888'
            expandIcon = expanded[id] ? 'minus-square-o' : 'plus-square-o';
        }

        let selectIcon = selected[id] ? 'check-square' : 'square-o';
        
        // 父子节点有关联，如果传入父节点key，则子节点自动选中, 反之亦然

        if (checkable && !checkStrictly) {
            if (selected[id] === false || selected[id] === undefined) {
                selectIcon = 'square-o';     // 子节点全不选
            } else if (selected[id] === true) {
                selectIcon = 'check-square'  // 子节点全选
            } else {
                selectIcon = 'minus-square'  // 子节点部分选中
            }
        }
        let selectColor = '#108EE9';
        let textStyle = {
            color: '#121212'
        };
        if (disabled) {
            selectColor = '#D0D0D0';
            textStyle.color = '#D0D0D0';
        }
        
        textStyle.marginLeft = 2;
        textStyle.fontSize = 16;
        /*if (selected[id]) {
            textStyle.backgroundColor = '#D2EAFB'
        }*/

        let textNode;
        if (typeof text === 'string') {
            textNode = <Text style={[textStyle,{flex:1}]}>{text}</Text>
        } else {
            textNode = <View>{text}</View>
        }
        let styles = this.props.styles || defaultStyles;
        if(this.props.defaultUser.indexOf(id) !== -1){
          return (
            <View style={styles.item}>
                    {hasChildren && 
                    <Icon 
                        // onPress={this.onExpand.bind(this, node)} 
                        style={[styles.icon, {color: '#FF9500'}]} 
                        size={expandIconSize} 
                        name={node.id=='55'?'bank':expandIcon} 
                    />}
                    {(checkable && !hasChildren) && 
                    <Icon 
                        // onPress={disabled ? ()=>{} : this.onSelect.bind(this, node)} 
                        style={[styles.icon, {color: '#C9C9C9'}]} 
                        size={iconSize} 
                        name={'check-square'} 
                    />}
                    {icon && 
                    <Icon 
                        style={styles.icon} 
                        size={iconSize} 
                        name={icon} 
                    />}
                    {/*<TouchableWithoutFeedback
                        onPress={this.onSelect.bind(this, node)}
                    >
                        <View style={{flex:1,backgroundColor:'green'}}>
                            {textNode}
                        </View>
                    </TouchableWithoutFeedback>*/}
                    {
                        hasChildren ? textNode : this.props.renderCell(id,text,userPicture,gender)
                    }
                    {
                        (checkable && hasChildren) && (
                            <View style={{flexDirection:'row',alignItems:'center',marginRight:15}}>
                                <Icon 
                                    onPress={disabled ? ()=>{} : this.onSelect.bind(this, node)} 
                                    style={[styles.icon, {color: selectColor}]} 
                                    size={iconSize} 
                                    name={selectIcon}
                                />
                                <Text style={{color:'#121212'}}>全选</Text>
                            </View>
                        )
                    
                    }
                </View>
          )
        }
        return (
            <TouchableWithoutFeedback onPress={hasChildren?this.onExpand.bind(this, node):this.onSelect.bind(this, node)}>
                <View style={styles.item}>
                    {hasChildren && 
                    <Icon 
                        onPress={this.onExpand.bind(this, node)} 
                        style={[styles.icon, {color: '#FF9500'}]} 
                        size={expandIconSize} 
                        name={node.id=='55'?'bank':expandIcon} 
                    />}
                    {(checkable && !hasChildren) && 
                    <Icon 
                        onPress={disabled ? ()=>{} : this.onSelect.bind(this, node)} 
                        style={[styles.icon, {color: selectColor}]} 
                        size={iconSize} 
                        name={selectIcon} 
                    />}
                    {icon && 
                    <Icon 
                        style={styles.icon} 
                        size={iconSize} 
                        name={icon} 
                    />}
                    {/*<TouchableWithoutFeedback
                        onPress={this.onSelect.bind(this, node)}
                    >
                        <View style={{flex:1,backgroundColor:'green'}}>
                            {textNode}
                        </View>
                    </TouchableWithoutFeedback>*/}
                    {
                        hasChildren ? textNode : this.props.renderCell(id,text,userPicture,gender)
                    }
                    {
                        (checkable && hasChildren) && (
                            <View style={{flexDirection:'row',alignItems:'center',marginRight:15}}>
                                <Icon 
                                    onPress={disabled ? ()=>{} : this.onSelect.bind(this, node)} 
                                    style={[styles.icon, {color: selectColor}]} 
                                    size={iconSize} 
                                    name={selectIcon}
                                />
                                <Text style={{color:'#121212'}}>全选</Text>
                            </View>
                        )
                    
                    }
                </View>
            </TouchableWithoutFeedback>
        )
    }

    /**
     * 渲染树节点
     * 单个根节点使用此入口
     * 和renderTree递归
     * @param {TreeNode} node 
     * @param {TreeNode} parentNode 父节点
     */
    renderNode(node, parentNode) {
        let styles = this.props.styles || defaultStyles;
        const {expanded} = this.state
        const {renderItem, showLine} = this.props
        const hasChildren = node.nodes && node.nodes.length > 0
        let childrenStyle = styles.children;
        if (showLine) {
            childrenStyle = styles.leftLine;
        }
        node.parentNode = parentNode;
        return (
            <View key={node.id} style={styles.node} >
                {this.renderItem(node)}
                {hasChildren && 
                <View style={childrenStyle}>
                    {expanded[node.id] && this.renderTree(node.nodes, node)}
                </View>
                }
            </View>
        )
    }

    /**
     * 渲染树节点
     * 多个根节点使用此入口
     * 和renderNode递归
     * @param {Array<TreeNode>} data 
     * @param {TreeNode} parentNode 父节点
     */
    renderTree(data, parentNode) {
        /*if(data[0].nodes.length < 1){
          return null;
        }*/
        let nodes = [];
        for (let i = 0; i < data.length; i++) {
            nodes.push(this.renderNode(data[i], parentNode))
        }
        return nodes
    }

    render() {
        let styles = this.props.styles || defaultStyles;
        return <ScrollView showsVerticalScrollIndicator={false} style={this.props.treeStyle || styles.tree}>
            {
              this.props.treeData[0].nodes.length <= 0 ? null : this.renderTree(this.props.treeData || [], null)
            }
        </ScrollView>
    }
}
const iconWidth = 20;
const lineMarginLeft = 4;
const defaultStyles = {
    tree: {
        paddingLeft: 10,
        height: ScreenHeight - 90,
    },
    node: {
        // paddingTop: 10
    },
    item: {
        flex: 1,
        height: 45,
        // backgroundColor:'red',
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomColor: '#ccc',
        borderBottomWidth: 1/PixelRatio.get(),
        marginBottom:1

    },
    children: {
        paddingLeft: iconWidth,
    },
    icon: {
        width: iconWidth
    },
    leftLine: {
        marginLeft: lineMarginLeft,
        paddingLeft: iconWidth - lineMarginLeft - 1,
        borderLeftWidth: 1,
        borderLeftColor: '#d9d9d9',
        borderStyle: 'solid',
    }
}
export default Tree
