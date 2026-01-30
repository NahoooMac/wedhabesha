# Quick Fix Guide: Chat Bubbles & File Upload

## What Was Fixed

### ✅ Chat Bubble Alignment
- **Sender messages** now align to the **right** with **blue background**
- **Receiver messages** now align to the **left** with **gray background**

### ✅ File Attachment Upload
- File uploads now work correctly
- Supports: JPEG, PNG, GIF, PDF (up to 25MB, max 5 files)

## How to Test

### 1. Test Chat Bubble Alignment

1. Open the messaging interface (Couple Dashboard or Vendor Dashboard)
2. Select a conversation
3. Send a message - it should appear on the **right** with a **blue background**
4. Messages from the other person should appear on the **left** with a **gray background**

**Check browser console** for debug logs like:
```
🔍 Message alignment debug: {
  isOwnMessage: true,  // Your messages
  senderType: "COUPLE",
  ...
}
```

### 2. Test File Upload

1. Open a conversation
2. Click the **attachment button** (📎 icon)
3. Select an image or PDF file
4. The file should appear in the preview area
5. Click **Send**
6. The message with attachment should be sent successfully

**If it fails**, check:
- File size < 25MB
- File type is JPEG, PNG, GIF, or PDF
- Browser console for error messages

## Troubleshooting

### Chat Bubbles Still Not Aligned?

1. **Hard refresh** the page (Ctrl+Shift+R or Cmd+Shift+R)
2. **Clear browser cache**
3. Check browser console for debug logs
4. Verify you're logged in correctly
5. Try a different conversation

### File Upload Still Failing?

1. Check file size (must be < 25MB)
2. Check file type (JPEG, PNG, GIF, PDF only)
3. Check browser console for errors
4. Verify backend server is running
5. Check network tab in DevTools

## Technical Details

### Files Changed
- `frontend/src/services/messagingApi.ts` - Fixed FormData field names
- `frontend/src/components/communication/SharedMessageThread.tsx` - Fixed ID comparison

### Key Changes
1. **ID Comparison**: Now handles string vs number comparison correctly
2. **FormData**: Uses `files` field name (matches backend multer config)
3. **API Endpoint**: Uses correct couple messaging endpoint

## Need Help?

Run the test suite in browser console:
```javascript
window.testMessagingFixes()
```

This will test:
- ✅ Chat bubble alignment
- ✅ File upload
- ✅ Text messages
- ✅ ID comparison logic

## Success Indicators

You'll know it's working when:
- ✅ Your messages appear on the right with blue background
- ✅ Other messages appear on the left with gray background
- ✅ Files upload without errors
- ✅ Attachments show preview/thumbnail
- ✅ No errors in browser console
