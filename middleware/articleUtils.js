/**
 * 將 Draft.js 格式轉換為 Tiptap 格式
 * @param {Object} draftContent - Draft.js 格式的內容
 * @returns {Object} Tiptap 格式的內容
 */
function convertDraftToTiptap(draftContent) {
  if (!draftContent || !draftContent.blocks) {
    return {
      type: 'doc',
      content: []
    };
  }

  const content = draftContent.blocks.map(block => {
    // 處理基本文字區塊
    let node = {
      type: 'paragraph',
      content: [{
        type: 'text',
        text: block.text
      }]
    };

    // 處理不同的區塊類型
    switch (block.type) {
      case 'ordered-list-item':
        return {
          type: 'orderedList',
          content: [{
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{
                type: 'text',
                text: block.text
              }]
            }]
          }]
        };
      case 'blockquote':
        return {
          type: 'blockquote',
          content: [{
            type: 'paragraph',
            content: [{
              type: 'text',
              text: block.text
            }]
          }]
        };
      default:
        // 處理內聯樣式
        if (block.inlineStyleRanges && block.inlineStyleRanges.length > 0) {
          let textContent = block.text;
          let marks = [];

          block.inlineStyleRanges.forEach(style => {
            switch (style.style) {
              case 'BOLD':
                marks.push({ type: 'bold' });
                break;
              case 'ITALIC':
                marks.push({ type: 'italic' });
                break;
              case 'UNDERLINE':
                marks.push({ type: 'underline' });
                break;
              case 'STRIKETHROUGH':
                marks.push({ type: 'strike' });
                break;
              case 'TEXT-RED':
                marks.push({ type: 'textStyle', attrs: { color: '#ff0000' } });
                break;
              case 'BG-RED':
                marks.push({ type: 'highlight', attrs: { color: '#ff0000' } });
                break;
              case 'BG-GREEN':
                marks.push({ type: 'highlight', attrs: { color: '#00ff00' } });
                break;
              case 'BG-PURPLE':
                marks.push({ type: 'highlight', attrs: { color: '#800080' } });
                break;
            }
          });

          if (marks.length > 0) {
            node.content[0].marks = marks;
          }
        }
        return node;
    }
  });

  return {
    type: 'doc',
    content
  };
}

/**
 * 將 Tiptap 格式轉換為 Draft.js 格式
 * @param {Object} tiptapContent - Tiptap 格式的內容
 * @returns {Object} Draft.js 格式的內容
 */
function convertTiptapToDraft(tiptapContent) {
  if (!tiptapContent || !tiptapContent.content) {
    return {
      blocks: [],
      entityMap: {}
    };
  }

  const blocks = tiptapContent.content.map((node, index) => {
    const block = {
      key: `block-${index}`,
      text: '',
      type: 'unstyled',
      depth: 0,
      inlineStyleRanges: [],
      entityRanges: [],
      data: {}
    };

    // 處理節點類型
    switch (node.type) {
      case 'orderedList':
        return {
          key: `block-${index}`,
          text: node.content[0].content[0].content[0].text,
          type: 'ordered-list-item',
          depth: 0,
          inlineStyleRanges: [],
          entityRanges: [],
          data: {}
        };
      case 'blockquote':
        return {
          key: `block-${index}`,
          text: node.content[0].content[0].text,
          type: 'blockquote',
          depth: 0,
          inlineStyleRanges: [],
          entityRanges: [],
          data: {}
        };
      default:
        // 處理段落內容
        if (node.content && node.content[0]) {
          const textNode = node.content[0];
          block.text = textNode.text || '';

          // 處理文字樣式
          if (textNode.marks) {
            textNode.marks.forEach(mark => {
              switch (mark.type) {
                case 'bold':
                  block.inlineStyleRanges.push({
                    offset: 0,
                    length: block.text.length,
                    style: 'BOLD'
                  });
                  break;
                case 'italic':
                  block.inlineStyleRanges.push({
                    offset: 0,
                    length: block.text.length,
                    style: 'ITALIC'
                  });
                  break;
                case 'underline':
                  block.inlineStyleRanges.push({
                    offset: 0,
                    length: block.text.length,
                    style: 'UNDERLINE'
                  });
                  break;
                case 'strike':
                  block.inlineStyleRanges.push({
                    offset: 0,
                    length: block.text.length,
                    style: 'STRIKETHROUGH'
                  });
                  break;
                case 'textStyle':
                  if (mark.attrs && mark.attrs.color === '#ff0000') {
                    block.inlineStyleRanges.push({
                      offset: 0,
                      length: block.text.length,
                      style: 'TEXT-RED'
                    });
                  }
                  break;
                case 'highlight':
                  if (mark.attrs) {
                    switch (mark.attrs.color) {
                      case '#ff0000':
                        block.inlineStyleRanges.push({
                          offset: 0,
                          length: block.text.length,
                          style: 'BG-RED'
                        });
                        break;
                      case '#00ff00':
                        block.inlineStyleRanges.push({
                          offset: 0,
                          length: block.text.length,
                          style: 'BG-GREEN'
                        });
                        break;
                      case '#800080':
                        block.inlineStyleRanges.push({
                          offset: 0,
                          length: block.text.length,
                          style: 'BG-PURPLE'
                        });
                        break;
                    }
                  }
                  break;
              }
            });
          }
        }
        return block;
    }
  });

  return {
    blocks,
    entityMap: {}
  };
}

module.exports = {
  convertDraftToTiptap,
  convertTiptapToDraft
};
