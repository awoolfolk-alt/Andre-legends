LOCAL STUDY MUSIC (never published)
====================================
Put MP3 files you OWN in this folder, then list them in playlist.json:

  [
    { "title": "Song Name", "artist": "Artist Name", "file": "song.mp3" }
  ]

Why this folder is special: .gitignore tells git to IGNORE the MP3s here,
so they never get uploaded to GitHub or the live site. They play only on
your own computer, marked "(local only)" in the jukebox.

WHY NOT publish other artists' MP3s? Giving credit is not permission.
A public website makes COPIES of the file. To share a song you love on
the live site, use an official embed instead (see src/music/playlist.ts).
