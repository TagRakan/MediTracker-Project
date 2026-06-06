package com.MTA.V01.models;

import com.MTA.V01.models.enumerationClasses.LogType;
import com.MTA.V01.models.enumerations.ELogType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Date;

//TODO add data safety

@Entity
@Table(name = "system_logs")
@NoArgsConstructor
@Setter
@Getter
public class Log {
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Id
    private Long id;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "log_type")
    private LogType logType;

    private String description;

    private LocalDateTime localDateTime;

    public Log(LogType logType, String description) {
        this.logType = logType;
        this.description = description;
    }

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;


}
